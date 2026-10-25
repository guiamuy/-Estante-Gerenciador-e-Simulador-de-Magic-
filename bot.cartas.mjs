// B-180 · Auditoria carta a carta do Shark (história B-23): joga Shark × Shark com as cinco listas do Shark (os 20
// confrontos, cada um nos dois assentos pela semente) e conta, por carta, quantas vezes o Shark PODIA usá-la (alguma jogada
// legal da decisão sai dela), quantas vezes USOU, em que passo, em que alvo, e quantas vezes ela terminou a partida na mão
// depois de ter podido sair. Fora do portão (não é teste; a contagem é testada em bot.cartas.unit.test.mjs).
// Uso: node bot.cartas.mjs [orcamentoMs=400] [nivel=shark | shark-v13 | z:peça,…] [sementes=1] [saida.json]
//      FATIA=i/n divide os confrontos entre processos (um por núcleo); `--junta a.json b.json …` soma e imprime.
// Lê só o que a partida mostra a quem audita (as jogadas legais e a escolhida de cada jogador): não muda o bot.

// Jogadas que não são "usar a carta": passar, desistir, virar terreno para mana, e as respostas a decisões pendentes
// (descartar, escolher, manter) — essas contam à parte, em `outras`.
const NAO_E_USO = new Set(['pass', 'concede', 'tap_mana', 'keep', 'mulligan']);
const ESCOLHA = /^(discard|pick|choose|order|pay|may|answer|confirm|select|bottom|scry|surveil|name|mode|target|sacrifice|block|attack)/;
const ehUso = a => !!a && !!a.oid && !NAO_E_USO.has(a.t) && !ESCOLHA.test(a.t);

/** Acumulador vazio. */
export function novaAuditoria() { return { cartas: {}, partidas: 0, decisoes: 0 }; }
function ficha(acc, nome) {
  return acc.cartas[nome] || (acc.cartas[nome] = { podia: 0, usou: 0, copias: 0, copiasUsadas: 0, tipos: {}, passos: {}, alvos: {}, maoNoFim: 0, outras: 0, exemplos: [] });
}
const alvoDe = (s, p, t) => t.player != null ? (t.player === p ? 'eu' : 'ele')
  : !s.objects[t.oid] ? '?' : (s.stack.includes(t.oid) ? 'pilha-' : '') + (s.objects[t.oid].controller === p ? 'meu' : 'dele');

/** Uma decisão do jogador `p` no estado `s`: `acoes` são as legais, `escolhida` a que ele jogou. `vistas` (Set, por partida)
    guarda os objetos que puderam sair e `usadas` (Set, por partida) os que saíram, para contar por cópia. Pura: só lê `s`,
    escreve em `acc` e nos conjuntos. */
export function registraDecisao(acc, s, p, acoes, escolhida, vistas = null, motivo = '', usadas = null) {
  acc.decisoes++;
  const nomeDe = oid => (s.objects[oid] || {}).name;
  const podiam = new Set();
  for (const a of acoes) if (ehUso(a) && s.objects[a.oid] && s.objects[a.oid].owner === p) { podiam.add(nomeDe(a.oid)); if (vistas) { vistas.add(a.oid); (acc.nomes || (acc.nomes = {}))[a.oid] = nomeDe(a.oid); } }
  const usada = ehUso(escolhida) && s.objects[escolhida.oid] ? nomeDe(escolhida.oid) : null;
  for (const nome of podiam) {
    const f = ficha(acc, nome); f.podia++;
    if (nome !== usada && f.exemplos.length < 3 && s.turn) f.exemplos.push({ turno: s.turn.number, passo: s.turn.step, pilha: s.stack.length, escolheu: escolhida ? escolhida.t + (escolhida.oid ? ' ' + (nomeDe(escolhida.oid) || '') : '') : null, motivo: String(motivo || '').slice(0, 80) });
  }
  if (escolhida && escolhida.oid && !ehUso(escolhida) && !NAO_E_USO.has(escolhida.t) && s.objects[escolhida.oid]) ficha(acc, nomeDe(escolhida.oid)).outras++;
  if (!usada) return;
  if (usadas) usadas.add(escolhida.oid);
  const f = ficha(acc, usada); f.usou++;
  f.tipos[escolhida.t] = (f.tipos[escolhida.t] || 0) + 1;
  const passo = (s.turn ? s.turn.step : '?') + (s.stack.length ? '+pilha' : '') + (s.turn && s.turn.active === p ? '' : '·dele');
  f.passos[passo] = (f.passos[passo] || 0) + 1;
  for (const t of escolhida.targets || []) {
    const k = alvoDe(s, p, t); f.alvos[k] = (f.alvos[k] || 0) + 1;
    if ((k === 'meu' || k === 'eu' || k === 'pilha-meu') && (f.exemplosProprio || (f.exemplosProprio = [])).length < 3)
      f.exemplosProprio.push({ turno: s.turn && s.turn.number, passo: s.turn && s.turn.step, alvo: t.oid ? nomeDe(t.oid) : 'jogador', motivo: String(motivo || '').slice(0, 80) });
  }
  if (escolhida.alt != null) f.alvos['custo alternativo'] = (f.alvos['custo alternativo'] || 0) + 1; // o índice 0 é o primeiro custo alternativo
}

/** Fim da partida: carta que podia ter saído e ficou na mão até o fim conta em `maoNoFim`; por cópia, quantas puderam sair
    (`copias`) e quantas saíram (`copiasUsadas`). */
export function fechaPartida(acc, s, vistasPorJogador, usadasPorJogador = []) {
  acc.partidas++;
  vistasPorJogador.forEach((vistas, p) => {
    const usadas = usadasPorJogador[p] || new Set();
    // ficha que saiu do jogo (Blood, Food, Treasure) não está mais em `s.objects`: o nome ficou guardado ao ser vista
    for (const oid of vistas) { const f = ficha(acc, (s.objects[oid] || {}).name || (acc.nomes || {})[oid] || '?'); f.copias++; if (usadas.has(oid)) f.copiasUsadas++; }
    for (const oid of s.zones[p].hand) if (vistas.has(oid)) ficha(acc, s.objects[oid].name).maoNoFim++;
  });
  acc.nomes = {};
}

/** Soma auditorias (processos em paralelo). */
export function junta(...accs) {
  const r = novaAuditoria();
  for (const a of accs) {
    r.partidas += a.partidas; r.decisoes += a.decisoes;
    for (const [nome, f] of Object.entries(a.cartas)) {
      const g = ficha(r, nome);
      g.podia += f.podia; g.usou += f.usou; g.maoNoFim += f.maoNoFim; g.outras += f.outras; g.copias += f.copias || 0; g.copiasUsadas += f.copiasUsadas || 0;
      for (const k of ['tipos', 'passos', 'alvos']) for (const [x, n] of Object.entries(f[k])) g[k][x] = (g[k][x] || 0) + n;
      for (const e of f.exemplos) if (g.exemplos.length < 3) g.exemplos.push(e);
      for (const e of f.exemplosProprio || []) if ((g.exemplosProprio || (g.exemplosProprio = [])).length < 3) g.exemplosProprio.push(e);
    }
  }
  return r;
}

/** Classe de cada carta pela evidência, contada por cópia (uma instantânea pode sair em quase toda decisão, então a taxa por
    decisão não diz nada): "não usa" (3+ cópias puderam sair e nenhuma saiu), "a revisar" (menos da metade das cópias saiu,
    ou a remoção/anulação mirou o próprio lado), "usa" (o resto), "pouca evidência" (menos de 3 cópias puderam sair). A
    palavra final ("usa bem" ou "usa mal") vem da leitura das partidas. */
export function classifica(acc, facts = {}) {
  const rem = nome => /"do":"(destroy|damage|counter|exile|bounce|return_to_hand|minus|fight)"/.test(JSON.stringify(((facts[nome] || {}).script) || {}));
  return Object.entries(acc.cartas).map(([nome, f]) => {
    const proprio = (f.alvos.meu || 0) + (f.alvos['pilha-meu'] || 0) + (f.alvos.eu || 0);
    const copias = f.copias || 0, usadas = f.copiasUsadas || 0;
    const classe = copias < 3 ? 'pouca evidência'
      : usadas === 0 ? 'não usa'
      : usadas / copias < 0.5 || (rem(nome) && proprio > 0) ? 'a revisar'
      : 'usa';
    return { nome, classe, podia: f.podia, usou: f.usou, taxa: copias ? +(usadas / copias).toFixed(2) : 0, maoNoFim: f.maoNoFim, proprio, ...f };
  }).sort((a, b) => ['não usa', 'a revisar', 'pouca evidência', 'usa'].indexOf(a.classe) - ['não usa', 'a revisar', 'pouca evidência', 'usa'].indexOf(b.classe) || a.nome.localeCompare(b.nome));
}

if (process.argv[1] && process.argv[1].endsWith('bot.cartas.mjs')) {
  const fs = await import('fs');
  if (process.argv[2] === '--junta') {
    const accs = process.argv.slice(3).map(f => JSON.parse(fs.readFileSync(f, 'utf8')).acc);
    imprime(junta(...accs), JSON.parse(fs.readFileSync(process.argv[3], 'utf8')).facts || {});
  } else {
    const [ORC, NIVEL, NS, SAIDA] = [+(process.argv[2] || 400), process.argv[3] || 'shark', +(process.argv[4] || 1), process.argv[5]];
    const FAT = process.env.FATIA ? process.env.FATIA.split('/').map(Number) : null;
    const { loadModules } = await import('./_load.mjs');
    const { listasDoShark } = await import('./torneio.listas.mjs');
    const { engine: E, bot: B } = loadModules();
    const L = listasDoShark(); const acc = novaAuditoria(); const facts = {}; let ilegais = 0, k = 0;
    const cria = () => NIVEL.startsWith('z:') ? B.criaBot({ nivel: 'shark', orcamentoMs: ORC, extra: Object.fromEntries(NIVEL.slice(2).split(',').map(x => x.startsWith('!') ? [x.slice(1), false] : [x, true])) }) : B.criaBot({ nivel: NIVEL, orcamentoMs: ORC });
    for (let sem = 1; sem <= NS; sem++) for (let i = 0; i < L.length; i++) for (let j = 0; j < L.length; j++) {
      if (i === j) continue; const kk = k++; if (FAT && kk % FAT[1] !== FAT[0]) continue;
      const cards = {}; for (const x of [L[i], L[j]]) for (const e of x.entries) cards[e.name] = x.cartas[e.name];
      let s = E.createGame({ format: 'pauper', seed: 500 * sem + i * 7 + j, mode: 'full', manaCheck: true, cards, players: [{ name: 'A', deck: L[i].entries }, { name: 'B', deck: L[j].entries }] });
      Object.assign(facts, Object.fromEntries(Object.entries(s.facts).map(([n, f]) => [n, { script: f.script || null }])));
      const bots = [cria(), cria()], vistas = [new Set(), new Set()], usadas = [new Set(), new Set()];
      for (let n = 0; n < 1500 && s.status !== 'over'; n++) {
        const q = s.status === 'mulligan' ? s.players.findIndex(pl => !pl.kept) : s.pending ? s.pending.p : s.turn.priority;
        if (q < 0) break;
        const j2 = s.status === 'mulligan' ? bots[q].mulligan(s, q) : bots[q].jogada(s, q);
        if (s.status === 'playing') registraDecisao(acc, s, q, E.legalActions(s, q), j2.acao, vistas[q], j2.motivo, usadas[q]);
        try { s = E.apply(s, j2.acao).state; } catch (e) { ilegais++; break; }
      }
      fechaPartida(acc, s, vistas, usadas);
    }
    acc.ilegais = ilegais;
    if (SAIDA) fs.writeFileSync(SAIDA, JSON.stringify({ acc, facts }));
    imprime(acc, facts);
  }
  function imprime(acc, facts) {
    const linhas = classifica(acc, facts);
    console.log(JSON.stringify({ partidas: acc.partidas, decisoes: acc.decisoes, ilegais: acc.ilegais || 0, cartas: linhas.length, porClasse: linhas.reduce((m, l) => (m[l.classe] = (m[l.classe] || 0) + 1, m), {}) }));
    for (const l of linhas) console.log([l.classe.padEnd(15), l.nome.padEnd(32), `podia ${l.podia}`.padEnd(10), `usou ${l.usou}`.padEnd(9), `cópias ${l.copiasUsadas}/${l.copias}`.padEnd(14), `mão no fim ${l.maoNoFim}`.padEnd(14), JSON.stringify(l.alvos), JSON.stringify(l.tipos), l.classe === 'usa' ? '' : JSON.stringify(l.exemplos[0] || null)].join(' '));
  }
}
