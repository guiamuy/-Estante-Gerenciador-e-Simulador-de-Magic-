// Leva P-4 · T6c-1 · regras do Realtime Database (database.rules.json) com teste.
// As regras moram no repositório e o portão as confere: um avaliador pequeno da linguagem de regras do Realtime
// Database (leitura e escrita em cascata, validação nos nós que mudam, $variáveis, root/data/newData/auth/now)
// roda o CÓDIGO REAL do app (perfil remoto, fila de relatos, sala online) por um transporte que aplica as regras.
// Se as regras abrirem demais ou fecharem um caminho que o app usa, este arquivo cai.
// Resíduo declarado: o avaliador cobre o subconjunto que as regras usam; o simulador oficial (emulador) fica para
// um job opcional. A conferência final é publicar no console e ver o app funcionar (passo do dono).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadModules, ROOT } from './_load.mjs';

const { remoto: R, perfil: PF, online: O } = loadModules();
const TEXTO = readFileSync(join(ROOT, 'database.rules.json'), 'utf8');
const REGRAS = JSON.parse(TEXTO).rules;

/* ---------- avaliador ---------- */
if (!String.prototype.__casa) Object.defineProperty(String.prototype, '__casa', { value(re) { return re.test(String(this)); } });
const copia = v => (v === undefined || v === null ? null : JSON.parse(JSON.stringify(v)));
const segs = c => String(c).split('/').filter(Boolean);
const desce = (o, seg) => { for (const k of seg) { if (!o || typeof o !== 'object' || !(k in o)) return null; o = o[k]; } return o === undefined ? null : o; };
/** Grava `v` em `seg` e poda nó vazio (o banco não guarda objeto vazio nem null). */
function poe(raiz, seg, v) {
  const r = copia(raiz) || {};
  if (!seg.length) return poda(copia(v));
  let o = r; for (const k of seg.slice(0, -1)) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
  o[seg[seg.length - 1]] = copia(v);
  return poda(r);
}
function poda(v) {
  if (v === null || typeof v !== 'object') return v === undefined ? null : v;
  const o = {}; for (const [k, x] of Object.entries(v)) { const y = poda(x); if (y !== null) o[k] = y; }
  return Object.keys(o).length ? o : null;
}
class Snap {
  constructor(raiz, seg) { this.raiz = raiz; this.seg = seg; }
  val() { return copia(desce(this.raiz, this.seg)); }
  exists() { return desce(this.raiz, this.seg) !== null; }
  child(c) { return new Snap(this.raiz, [...this.seg, ...segs(c)]); }
  hasChild(c) { return this.child(c).exists(); }
  hasChildren(l) { const v = this.val(); if (!l) return !!v && typeof v === 'object'; return l.every(c => this.hasChild(c)); }
  isString() { return typeof this.val() === 'string'; }
  isNumber() { return typeof this.val() === 'number'; }
  isBoolean() { return typeof this.val() === 'boolean'; }
  parent() { return new Snap(this.raiz, this.seg.slice(0, -1)); }
}
/** Nós de regra ao longo do caminho: [{ no, prof, vars }] da raiz (prof 0) até onde houver regra. */
function trilha(seg) {
  const out = [{ no: REGRAS, prof: 0, vars: {} }]; let no = REGRAS, vars = {};
  for (let i = 0; i < seg.length; i++) {
    let prox = null;
    if (Object.prototype.hasOwnProperty.call(no, seg[i]) && !seg[i].startsWith('.')) prox = no[seg[i]];
    else { const coringa = Object.keys(no).find(k => k.startsWith('$')); if (coringa) { prox = no[coringa]; vars = { ...vars, [coringa]: seg[i] }; } }
    if (!prox || typeof prox !== 'object') break;
    no = prox; out.push({ no, prof: i + 1, vars });
  }
  return out;
}
function avalia(expr, ctx) {
  if (expr === true || expr === false) return expr;
  const src = String(expr).replace(/\.matches\(/g, '.__casa(').replace(/\.contains\(/g, '.includes(').replace(/\.beginsWith\(/g, '.startsWith(');
  const nomes = Object.keys(ctx);
  try { return new Function(...nomes, `return (${src});`)(...nomes.map(n => ctx[n])) === true; } catch (e) { return false; }
}
const ctxDe = ({ antes, depois, seg, vars, auth, agora }) => ({ auth, now: agora, root: new Snap(antes, []), data: new Snap(antes, seg), newData: new Snap(depois, seg), ...vars });

function podeLer(banco, seg, auth, agora) {
  return trilha(seg).some(({ no, prof, vars }) => no['.read'] !== undefined && avalia(no['.read'], ctxDe({ antes: banco, depois: banco, seg: seg.slice(0, prof), vars, auth, agora })));
}
function podeEscrever(antes, depois, seg, auth, agora) {
  return trilha(seg).some(({ no, prof, vars }) => no['.write'] !== undefined && avalia(no['.write'], ctxDe({ antes, depois, seg: seg.slice(0, prof), vars, auth, agora })));
}
/** Validação: em todo nó que existe no dado novo, da raiz até o caminho escrito e em tudo abaixo dele. */
function valida(antes, depois, seg, auth, agora) {
  const caminhos = [];
  for (let i = 0; i <= seg.length; i++) caminhos.push(seg.slice(0, i));
  const abaixo = (s) => { const v = desce(depois, s); if (v && typeof v === 'object') for (const k of Object.keys(v)) { caminhos.push([...s, k]); abaixo([...s, k]); } };
  abaixo(seg);
  for (const s of caminhos) {
    if (desce(depois, s) === null) continue;
    const t = trilha(s); const ult = t[t.length - 1];
    if (ult.prof !== s.length || ult.no['.validate'] === undefined) continue;
    if (!avalia(ult.no['.validate'], ctxDe({ antes, depois, seg: s, vars: ult.vars, auth, agora }))) return '/' + s.join('/');
  }
  return null;
}
/** Banco com regras: guarda o estado e aplica leitura, escrita (várias de uma vez, atômica) e validação. */
function bancoComRegras({ agora = () => 1_000_000_000 } = {}) {
  let dados = null; let n = 0;
  const negado = (onde) => Object.assign(new Error('api'), { status: 401, onde });
  return {
    dados: () => copia(dados),
    agora,
    ler(caminho, auth) { const s = segs(caminho); if (!podeLer(dados, s, auth, agora())) throw negado('/' + s.join('/')); return copia(desce(dados, s)); },
    escreverVarios(escritas, auth) {
      let depois = dados; for (const [s, v] of escritas) depois = poe(depois, s, v);
      for (const [s] of escritas) if (!podeEscrever(dados, depois, s, auth, agora())) throw negado('/' + s.join('/'));
      for (const [s] of escritas) { const ruim = valida(dados, depois, s, auth, agora()); if (ruim) throw negado(ruim); }
      dados = depois;
    },
    novaChave() { return '-N' + String(++n).padStart(6, '0'); }
  };
}
/** Transporte do app (mesmo contrato do de memória e do Firebase) sobre o banco com regras, como uma pessoa. */
function transporte(banco, auth) {
  return {
    kind: 'regras',
    async ler(c) { return banco.ler(c, auth); },
    async escrever(c, v) { banco.escreverVarios([[segs(c), v === undefined ? null : v]], auth); },
    async atualizar(c, patch) { banco.escreverVarios(Object.entries(patch || {}).map(([k, v]) => [[...segs(c), ...segs(k)], v === undefined ? null : v]), auth); },
    async empurrar(c, v) { const k = banco.novaChave(); banco.escreverVarios([[[...segs(c), k], v]], auth); return k; },
    async apagar(c) { banco.escreverVarios([[segs(c), null]], auth); },
    ouvir(c, cb) { Promise.resolve().then(() => { try { cb(banco.ler(c, auth)); } catch (e) { cb(null); } }); return () => {}; },
    ligado: () => true, aoMudarLigacao: () => () => {}
  };
}
const ANA = { uid: 'uidDaAna_123' }, BETO = { uid: 'uidDoBeto-456' }, CAIO = { uid: 'uidDoCaio789' };
const recusa = async (p, onde) => { const e = await p.then(() => null, e => e); assert.ok(e, `devia ser recusado${onde ? ' em ' + onde : ''}`); assert.equal(e.status, 401, `recusa do banco, não erro do app: ${e && e.message}`); return e; };
const docLocal = (preferencias, { nome = 'Ana', avatar = null, em = 10 } = {}) => ({
  kind: PF.DOC_KIND, version: PF.DOC_VERSION, atualizadoEm: em, pessoa: { nome, avatar, atualizadoEm: em },
  preferencias, carimbos: Object.fromEntries(Object.keys(preferencias).map(k => [k, em]))
});

/* ---------- o arquivo ---------- */
test('P-4 · regras: JSON válido, raiz fechada, só caminhos conhecidos no primeiro nível', () => {
  assert.equal(REGRAS['.read'], false); assert.equal(REGRAS['.write'], false);
  assert.deepEqual(Object.keys(REGRAS).filter(k => !k.startsWith('.')).sort(), ['bloqueios', 'perfis', 'relatos', 'salas', 'usuarios']); // G-266 · usuarios: a reserva do nome de usuário
});

test('P-4 · regras: expressões regulares só no subconjunto que o Firebase aceita (sem chaves, âncora só nas pontas)', () => {
  const regs = [...TEXTO.matchAll(/\.matches\((\/(?:\\.|[^/])+\/)\)/g)].map(m => m[1]);
  assert.ok(regs.length >= 8, 'achou as expressões');
  for (const r of regs) {
    const corpo = r.slice(1, -1);
    assert.ok(!/[{}]/.test(corpo), `quantificador {n,m} não é garantido no Firebase: ${r}`);
    assert.ok(!/\(\?/.test(corpo), `grupo especial não existe no Firebase: ${r}`);
    assert.ok(!/.\^/.test(corpo.replace(/\[\^/g, '[')), `^ só no começo: ${r}`);
    assert.ok(!/\$./.test(corpo), `$ só no fim: ${r}`);
  }
});

test('P-4 · contrato: as chaves e os tetos das regras são os do app (preferência nova exige regra nova)', () => {
  const lista = TEXTO.match(/\$chave\.matches\(\/\^\(([^)]+)\)\$\//)[1].split('|').sort();
  const app = [...PF.DO_DOCUMENTO].map(k => R.codifica(k)).sort(); // cópia: o array vem de outro contexto (vm)
  assert.deepEqual(lista, app, 'preferência nova no REGISTRO: acrescente a chave em database.rules.json e publique as regras no console do Firebase');
  assert.ok(TEXTO.includes(`newData.val().length <= ${R.VALOR_MAX}`), 'teto do valor = VALOR_MAX');
  assert.ok(TEXTO.includes(`newData.val().length <= ${R.RELATO_MAX}`), 'teto do relato = RELATO_MAX');
  assert.ok(TEXTO.includes(`newData.val().length <= ${O.MENSAGEM_MAX}`), 'teto da mensagem = MENSAGEM_MAX');
  assert.ok(TEXTO.includes(`newData.val().length <= ${PF.NOME_MAX}`), 'teto do nome = NOME_MAX');
  assert.ok(TEXTO.includes(`now - ${O.VALIDADE_MS}`), 'validade da sala = VALIDADE_MS');
  assert.ok(PF.avatarValido('data:image/png;base64,' + 'A'.repeat(399000)) && !PF.avatarValido('data:image/png;base64,' + 'A'.repeat(400000)));
  assert.ok(TEXTO.includes('length < 400000'), 'teto da foto = o do app');
});

/* ---------- perfil por pessoa (código real da A-262) ---------- */
test('P-4 · perfil: o dono envia, lê e apaga o próprio perfil; o encontro roda inteiro sob as regras', async () => {
  const b = bancoComRegras();
  const meu = R.createPerfilRemoto({ transporte: transporte(b, ANA), uid: ANA.uid });
  const foto = 'data:image/jpeg;base64,' + 'B'.repeat(200);
  const r = await meu.enviar(docLocal({ 'ui.theme': 'claro', 'decks.reservaVista.v2': { a: 1 }, 'mesa.som': false }, { avatar: foto }));
  assert.equal(r.conferido, true);
  assert.deepEqual([...r.enviadas].sort(), ['decks.reservaVista.v2', 'mesa.som', 'ui.theme']);
  const lido = await meu.ler();
  assert.equal(lido.doc.preferencias['ui.theme'], 'claro');
  assert.equal(lido.doc.pessoa.avatar, foto);
  // segunda passada sem novidade: nada sobe, nada é recusado
  assert.equal((await meu.enviar(docLocal({ 'ui.theme': 'claro', 'decks.reservaVista.v2': { a: 1 }, 'mesa.som': false }, { avatar: foto }), lido.remoto)).enviadas.length, 0);
  assert.equal(await meu.apagarTudo(), true);
});

test('P-4 · perfil: outra pessoa e quem não entrou não leem nem escrevem o perfil de ninguém', async () => {
  const b = bancoComRegras();
  await R.createPerfilRemoto({ transporte: transporte(b, ANA), uid: ANA.uid }).enviar(docLocal({ 'ui.theme': 'claro' }));
  const intruso = R.createPerfilRemoto({ transporte: transporte(b, BETO), uid: ANA.uid });
  await recusa(intruso.ler(), 'ler perfil alheio');
  await recusa(intruso.enviar(docLocal({ 'ui.theme': 'escuro' }, { em: 99 })), 'escrever perfil alheio');
  await recusa(intruso.apagarTudo(), 'apagar perfil alheio');
  const anonimo = R.createPerfilRemoto({ transporte: transporte(b, null), uid: ANA.uid });
  await recusa(anonimo.ler(), 'ler sem conta');
  await recusa(transporte(b, BETO).ler('perfis'), 'listar perfis');
  assert.equal(b.dados().perfis[ANA.uid].doc.p['ui:theme'].v, '"claro"', 'nada mudou');
});

test('P-4 · perfil: forma e tamanho conferidos no banco (chave fora da lista, valor grande, tipo errado, campo a mais)', async () => {
  const b = bancoComRegras(); const t = transporte(b, ANA); const doc = `perfis/${ANA.uid}/doc`;
  await R.createPerfilRemoto({ transporte: t, uid: ANA.uid }).enviar(docLocal({ 'ui.theme': 'claro' }));
  await recusa(t.atualizar(doc, { 'p/conta': { v: '"x"', t: 1 } }), 'chave que não é preferência (conta é do aparelho)');
  await recusa(t.atualizar(doc, { 'p/ui:theme': { v: 'x'.repeat(R.VALOR_MAX + 1), t: 20 } }), 'valor acima do teto');
  await recusa(t.atualizar(doc, { 'p/ui:theme': { v: '"y"', t: 'ontem' } }), 'instante que não é número');
  await recusa(t.atualizar(doc, { 'p/ui:theme': { v: '"y"' } }), 'preferência sem instante');
  await recusa(t.atualizar(doc, { 'p/ui:theme': { v: '"y"', t: 20, extra: 1 } }), 'campo a mais na preferência');
  await recusa(t.atualizar(doc, { kind: 'outra.coisa' }), 'tipo do documento');
  await recusa(t.atualizar(doc, { nome: 'n'.repeat(PF.NOME_MAX + 1) }), 'nome longo');
  await recusa(t.atualizar(doc, { segredo: 'x' }), 'campo desconhecido no documento');
  await recusa(t.escrever(`perfis/${ANA.uid}/outra`, { x: 1 }), 'nó desconhecido no perfil');
  await recusa(t.escrever(`perfis/${ANA.uid}/avatar`, { dado: 'https://exemplo.com/foto.png', em: 1 }), 'foto por endereço de fora');
  await recusa(t.escrever(`perfis/${ANA.uid}/avatar`, { dado: 'data:image/png;base64,' + 'A'.repeat(400000), em: 1 }), 'foto grande');
  await t.atualizar(doc, { 'p/ui:theme': { t: 30 } }); // apagar a escolha (sem v) é válido
  assert.equal(b.dados().perfis[ANA.uid].doc.p['ui:theme'].v, undefined);
});

/* ---------- fila de relatos (código real da A-262) ---------- */
test('P-4 · fila de relatos: o dono põe o relato, reenvia sem duplicar e confere; ninguém altera nem lê a fila dos outros', async () => {
  const b = bancoComRegras();
  const fila = R.createFilaDeRelatos({ transporte: transporte(b, ANA), uid: ANA.uid, agora: () => Date.UTC(2026, 9, 11) });
  const relato = { id: 'r-abc_123', tipo: 'bug', texto: 'a carta virou sozinha' };
  assert.equal((await fila.enfileira(relato)).conferido, true);
  assert.equal((await fila.enfileira(relato)).conferido, true, 'reenviar o mesmo relato não é recusado');
  assert.deepEqual([...await fila.pendentes()], ['r-abc_123']);
  const t = transporte(b, ANA), no = `relatos/fila/${ANA.uid}/r-abc_123`;
  await recusa(t.atualizar(no, { dado: JSON.stringify({ ...relato, texto: 'outro' }) }), 'alterar relato já na fila');
  await recusa(t.apagar(no), 'tirar da fila pelo app (quem tira é o fluxo do repositório)');
  await recusa(R.createFilaDeRelatos({ transporte: transporte(b, BETO), uid: ANA.uid }).pendentes(), 'ler fila alheia');
  await recusa(R.createFilaDeRelatos({ transporte: transporte(b, BETO), uid: ANA.uid }).enfileira({ id: 'r2' }), 'escrever na fila alheia');
  await recusa(R.createFilaDeRelatos({ transporte: transporte(b, null), uid: ANA.uid }).enfileira({ id: 'r3' }), 'sem conta');
  await recusa(transporte(b, ANA).ler('relatos/fila'), 'listar a fila de todos');
  await recusa(t.escrever(`relatos/fila/${ANA.uid}/r9`, { kind: 'estante.relato', version: 1, enviadoEm: 'x', dado: 'd'.repeat(R.RELATO_MAX + 1) }), 'relato acima do teto');
  await recusa(t.escrever(`relatos/fila/${ANA.uid}/r10`, { kind: 'estante.relato', version: 1, enviadoEm: 'x', dado: '{}', anexo: 'x' }), 'campo a mais');
  await recusa(t.escrever(`relatos/fila/${ANA.uid}/r.11`, { kind: 'estante.relato', version: 1, enviadoEm: 'x', dado: '{}' }), 'id fora do formato');
});

/* ---------- sala online (código real da leva 130 a 137) ---------- */
test('P-4/P-8 · sala: quem entrou cria, o convidado entra, ações e mensagens só se acrescentam e cada assento é de uma conta; a partida roda sob as regras', async () => {
  let relogio = 1_000_000_000; const agora = () => relogio;
  const b = bancoComRegras({ agora }); let sorteio = 0;
  const salaA = O.createSala({ transporte: transporte(b, ANA), agora, aleatorio: () => (sorteio++ % 32) / 32, quem: () => ANA.uid });
  const salaB = O.createSala({ transporte: transporte(b, BETO), agora, quem: () => BETO.uid });
  const deck = { nome: 'Teste', cartas: [{ nome: 'Forest', qtd: 40 }] };
  const codigo = await salaA.criar({ nome: 'Ana', deck, formato: 'pauper' });
  await salaB.entrar(codigo, { nome: 'Beto', deck, formato: 'pauper' });
  await salaA.publicarSetup(codigo, { semente: 7, listas: [1, 2] });
  const k1 = await salaA.enviarAcao(codigo, { antes: 0, p: 0, action: { type: 'pass' }, de: 0 });
  await salaB.enviarAcao(codigo, { antes: 1, p: 1, action: { type: 'pass' }, de: 1 });
  await salaB.enviarMensagem(codigo, { de: 1, texto: 'boa partida' });
  await salaA.marcarPresenca(codigo, 0);
  await salaA.publicarProxima(codigo, 2, { setup: { semente: 8 } });
  await salaB.enviarAcao(codigo, { antes: 0, p: 1, action: { type: 'pass' }, de: 1 }, 2);
  await salaA.publicarTroca(codigo, 1, 0, { entries: [] });
  await salaB.publicarTroca(codigo, 1, 1, { entries: [] });
  // P-8 · cada assento é de uma conta: ninguém joga, fala ou troca pelo outro; quem está fora não lê a sala cheia
  const tC = transporte(b, CAIO);
  await recusa(tC.ler(`salas/${codigo}`), 'terceiro lendo sala com os dois jogadores');
  await recusa(tC.empurrar(`salas/${codigo}/acoes`, { antes: 9, p: 0, action: { type: 'pass' }, de: 0 }), 'terceiro jogando');
  await recusa(transporte(b, BETO).empurrar(`salas/${codigo}/acoes`, { antes: 9, p: 0, action: { type: 'pass' }, de: 0 }), 'convidado jogando como anfitrião');
  await recusa(transporte(b, ANA).empurrar(`salas/${codigo}/mensagens`, { de: 1, texto: 'sou o Beto', em: 1 }), 'anfitrião falando como convidado');
  await recusa(transporte(b, BETO).atualizar(`salas/${codigo}/serie/j1`, { a0: { entries: [], em: 1 } }), 'convidado trocando a lista do anfitrião');
  await recusa(transporte(b, BETO).atualizar(`salas/${codigo}/presenca`, { 0: 999 }), 'convidado marcando presença do anfitrião');
  await recusa(transporte(b, BETO).atualizar(`salas/${codigo}/jogos`, { j3: { setup: { semente: 1 } } }), 'convidado publicando a próxima partida');
  await recusa(tC.atualizar(`salas/${codigo}`, { estado: 'encerrada', fim: { motivo: 'x' } }), 'terceiro encerrando');
  await recusa(tC.apagar(`salas/${codigo}`), 'terceiro apagando');
  await salaB.encerrar(codigo, 'concedeu'); // o convidado também pode encerrar (desistir)
  const tB = transporte(b, BETO), sala = `salas/${codigo}`;
  await recusa(tB.escrever(`${sala}/acoes/${k1}`, { antes: 0, p: 1, action: { type: 'concede' } }), 'reescrever ação já feita');
  await recusa(tB.apagar(`${sala}/acoes/${k1}`), 'apagar ação já feita');
  await recusa(tB.escrever(`${sala}/setup`, { semente: 1 }), 'trocar o setup depois de publicado');
  await recusa(transporte(b, CAIO).atualizar(sala, { convidado: { nome: 'Caio', deck } }), 'tomar o lugar do convidado');
  await recusa(tB.empurrar(`${sala}/mensagens`, { de: 1, texto: 'x'.repeat(O.MENSAGEM_MAX + 1), em: 1 }), 'mensagem acima do teto');
  await recusa(tB.empurrar(`${sala}/mensagens`, { de: 1, texto: 'oi', em: 1, html: '<b>' }), 'campo a mais na mensagem');
  await recusa(tB.atualizar(sala, { estado: 'vencedor' }), 'estado fora da lista');
  await recusa(tB.atualizar(sala, { segredo: 1 }), 'campo desconhecido na sala');
  await salaA.apagar(codigo);
  assert.equal(b.dados(), null, 'apagar a sala limpa tudo');
});

test('P-4 · sala: sem conta não cria nem lê; código fora do formato, lista de salas e sala vencida são recusados', async () => {
  let relogio = 1_000_000_000; const agora = () => relogio;
  const b = bancoComRegras({ agora });
  await recusa(O.createSala({ transporte: transporte(b, null), agora }).criar({ nome: 'X', deck: { a: 1 }, formato: 'pauper' }), 'criar sem conta');
  await recusa(O.createSala({ transporte: transporte(b, ANA), agora }).criar({ nome: 'X', deck: { a: 1 }, formato: 'pauper' }), 'criar sem pôr o próprio uid no assento');
  await recusa(O.createSala({ transporte: transporte(b, ANA), agora, quem: () => BETO.uid }).criar({ nome: 'X', deck: { a: 1 }, formato: 'pauper' }), 'criar no nome de outra conta');
  const tA = transporte(b, ANA);
  await recusa(tA.escrever('salas/QUALQUER', { criadaEm: agora(), estado: 'esperando', formato: 'pauper', anfitriao: { nome: 'A', deck: 1 } }), 'código fora do formato');
  await recusa(tA.escrever('salas/ESTA-ABCD', { criadaEm: agora() - 3_600_000, estado: 'esperando', formato: 'pauper', anfitriao: { nome: 'A', deck: 1 } }), 'sala nascida no passado');
  const codigo = await O.createSala({ transporte: tA, agora, quem: () => ANA.uid }).criar({ nome: 'Ana', deck: { a: 1 }, formato: 'pauper' });
  assert.ok(await transporte(b, CAIO).ler(`salas/${codigo}`), 'sala esperando convidado: quem tem o código lê para entrar');
  await recusa(O.createSala({ transporte: transporte(b, CAIO), agora, quem: () => BETO.uid }).entrar(codigo, { nome: 'Caio', deck: { a: 1 }, formato: 'pauper' }), 'entrar no nome de outra conta');
  await recusa(tA.ler('salas'), 'listar salas');
  await recusa(transporte(b, null).ler(`salas/${codigo}`), 'ler sala sem conta');
  await recusa(tA.escrever(`salas/${codigo}`, { criadaEm: agora(), estado: 'esperando', formato: 'pauper', anfitriao: { nome: 'A', deck: 2, uid: ANA.uid } }), 'sobrescrever a sala inteira');
  relogio += O.VALIDADE_MS + 1;
  await recusa(O.createSala({ transporte: transporte(b, ANA), agora }).enviarMensagem(codigo, { de: 0, texto: 'ainda aí?' }), 'escrever em sala vencida');
  await recusa(transporte(b, BETO).apagar(`salas/${codigo}`), 'apagar sala de outra pessoa');
  await O.createSala({ transporte: tA, agora }).apagar(codigo); // o dono apaga mesmo vencida: é o que limpa
});

/* ---------- P-15 · SEG8b · contas bloqueadas (código real: createBloqueiosRemoto e createSala) ---------- */
test('P-15 · bloqueios: só a própria conta lê e escreve a lista; forma conferida no banco', async () => {
  const b = bancoComRegras();
  const daAna = O.createBloqueiosRemoto({ transporte: transporte(b, ANA), uid: ANA.uid });
  const lista = await daAna.encontrar(O.bloquear([], { uid: BETO.uid, nome: 'Beto', em: 5 }));
  assert.equal(lista[0].nuvem, true, 'o banco confirmou');
  assert.equal(JSON.stringify(await daAna.ler()), JSON.stringify({ [BETO.uid]: { nome: 'Beto', em: 5 } }));
  await recusa(transporte(b, BETO).ler(`bloqueios/${ANA.uid}`), 'o bloqueado lendo a lista de quem bloqueou');
  await recusa(transporte(b, CAIO).escrever(`bloqueios/${ANA.uid}/${CAIO.uid}`, null), 'terceiro tirando da lista dos outros');
  await recusa(transporte(b, null).ler(`bloqueios/${ANA.uid}`), 'sem conta');
  const tA = transporte(b, ANA);
  await recusa(tA.escrever(`bloqueios/${ANA.uid}/${ANA.uid}`, { nome: 'Eu', em: 1 }), 'bloquear a si mesma');
  await recusa(tA.escrever(`bloqueios/${ANA.uid}/x.y`, { nome: 'X', em: 1 }), 'chave fora do formato');
  await recusa(tA.escrever(`bloqueios/${ANA.uid}/${CAIO.uid}`, { nome: 'x'.repeat(41), em: 1 }), 'nome acima de 40');
  await recusa(tA.escrever(`bloqueios/${ANA.uid}/${CAIO.uid}`, { nome: 'Caio', em: 1, extra: 1 }), 'campo a mais');
  assert.equal(await daAna.apagarTudo(), true, 'a dona apaga a lista inteira');
});

test('P-15 · sala: o banco recusa a entrada do bloqueado nos dois sentidos, mesmo com um app que não confere a lista', async () => {
  const agora = () => 1_000_000_000;
  const b = bancoComRegras({ agora }); let sorteio = 0;
  const deck = { nome: 'Teste', cartas: [{ nome: 'Forest', qtd: 40 }] };
  const criaDaAna = async () => O.createSala({ transporte: transporte(b, ANA), agora, aleatorio: () => (sorteio++ % 32) / 32, quem: () => ANA.uid }).criar({ nome: 'Ana', deck, formato: 'pauper' });
  // app alterado: createSala sem `bloqueado`, só as regras decidem
  const entraComo = (quem, codigo) => O.createSala({ transporte: transporte(b, quem), agora, quem: () => quem.uid }).entrar(codigo, { nome: 'X', deck, formato: 'pauper' });
  // 1 · Ana bloqueou Beto: Beto não entra na sala dela
  await O.createBloqueiosRemoto({ transporte: transporte(b, ANA), uid: ANA.uid }).por(BETO.uid, { nome: 'Beto', em: 1 });
  const c1 = await criaDaAna();
  await recusa(entraComo(BETO, c1), 'bloqueado entrando na sala de quem bloqueou');
  assert.equal(await entraComo(CAIO, c1), c1, 'quem não está na lista entra como sempre');
  // 2 · Beto bloqueou Ana (e Ana não bloqueia ninguém): Beto também não entra na sala dela
  await O.createBloqueiosRemoto({ transporte: transporte(b, ANA), uid: ANA.uid }).tirar(BETO.uid);
  await O.createBloqueiosRemoto({ transporte: transporte(b, BETO), uid: BETO.uid }).por(ANA.uid, { nome: 'Ana', em: 2 });
  const c2 = await criaDaAna();
  await recusa(entraComo(BETO, c2), 'entrando na sala de quem você bloqueou');
  // 3 · desbloqueado dos dois lados: entra
  await O.createBloqueiosRemoto({ transporte: transporte(b, BETO), uid: BETO.uid }).tirar(ANA.uid);
  assert.equal(await entraComo(BETO, c2), c2);
});

test('P-16 · sala: as regras aceitam o código de 6 (o de hoje) e o de 4 (salas antigas); outro tamanho é recusado', async () => {
  const agora = () => 1_000_000_000; const b = bancoComRegras({ agora });
  const deck = { a: 1 };
  const codigo = await O.createSala({ transporte: transporte(b, ANA), agora, quem: () => ANA.uid }).criar({ nome: 'Ana', deck, formato: 'pauper' });
  assert.match(codigo, /^ESTA-[A-HJ-NP-Z2-9]{6}$/, 'com as regras do repositório, nasce com 6 (sem recuo)');
  assert.equal(await O.createSala({ transporte: transporte(b, BETO), agora, quem: () => BETO.uid }).entrar(codigo, { nome: 'Beto', deck, formato: 'pauper' }), codigo);
  const sala = (c) => ({ criadaEm: agora(), estado: 'esperando', formato: 'pauper', anfitriao: { nome: 'A', deck: 1, uid: ANA.uid } });
  await transporte(b, ANA).escrever('salas/ESTA-ABCD', sala());
  for (const ruim of ['ESTA-ABCDE', 'ESTA-ABCDEFG', 'ESTA-ABC']) await recusa(transporte(b, ANA).escrever(`salas/${ruim}`, sala()), ruim);
});

test('P-4 · o resto do banco é negado (ler a raiz, escrever fora dos três ramos)', async () => {
  const b = bancoComRegras();
  await recusa(transporte(b, ANA).ler(''), 'ler a raiz');
  await recusa(transporte(b, ANA).escrever('outra/coisa', { x: 1 }), 'ramo desconhecido');
  await recusa(transporte(b, ANA).escrever(`relatos/outra/${ANA.uid}`, { x: 1 }), 'fora da fila');
});

/* ---------- G-266 · T6f-3 · nome de usuário único (código real do app sob as regras) ---------- */
test('G-266 · nome de usuário: a primeira conta reserva; a outra recebe "em uso"; trocar solta o antigo; ninguém mexe na reserva dos outros', async () => {
  const b = bancoComRegras();
  const daAna = R.createNomeDeUsuario({ transporte: transporte(b, ANA), uid: ANA.uid, agora: () => 7 });
  const doBeto = R.createNomeDeUsuario({ transporte: transporte(b, BETO), uid: BETO.uid, agora: () => 8 });
  assert.equal(await daAna.meu(), null);
  assert.deepEqual({ ...(await daAna.reservar('  @Ana_01 ')) }, { nome: 'ana_01', mudou: true });
  assert.equal(JSON.stringify(b.dados().usuarios), JSON.stringify({ ana_01: { uid: ANA.uid, em: 7 } }));
  assert.equal((await daAna.meu()).nome, 'ana_01');
  assert.deepEqual({ ...(await daAna.reservar('ana_01')) }, { nome: 'ana_01', mudou: false }, 'o mesmo nome não escreve de novo');
  await assert.rejects(doBeto.reservar('ana_01'), /nome-em-uso/);
  // corrida: o Beto leu "livre" e a Ana escreveu antes; o banco recusa a segunda reserva
  await recusa(transporte(b, BETO).escrever('usuarios/ana_01', { uid: BETO.uid, em: 9 }), 'reserva por cima da de outra conta');
  await recusa(transporte(b, BETO).escrever('usuarios/ana_01', null), 'soltar a reserva de outra conta');
  await recusa(transporte(b, BETO).escrever('usuarios/beto', { uid: ANA.uid, em: 9 }), 'reservar em nome de outra conta');
  await recusa(transporte(b, BETO).escrever(`perfis/${BETO.uid}/usuario`, { nome: 'ana_01', em: 9 }), 'apontar o perfil para o nome dos outros');
  await recusa(transporte(b, BETO).escrever(`perfis/${BETO.uid}/usuario`, { nome: 'livre', em: 9 }), 'apontar para nome sem reserva');
  await recusa(transporte(b, null).ler('usuarios/ana_01'), 'sem conta não lê');
  assert.equal((await transporte(b, BETO).ler('usuarios/ana_01')).uid, ANA.uid, 'com conta, dá para ver que está em uso');
  // trocar: reserva o novo, aponta o perfil e o antigo fica livre para o Beto
  assert.deepEqual({ ...(await daAna.reservar('aninha')) }, { nome: 'aninha', mudou: true });
  assert.equal((await daAna.meu()).nome, 'aninha');
  assert.equal(b.dados().usuarios.ana_01, undefined, 'o antigo foi solto');
  assert.deepEqual({ ...(await doBeto.reservar('ana_01')) }, { nome: 'ana_01', mudou: true });
});

test('G-266 · nome de usuário: formato conferido no app e no banco; banco com as regras antigas diz "ainda não ligado"', async () => {
  for (const [n, e] of [['ab', 'nome-curto'], ['a'.repeat(21), 'nome-longo'], ['joão', 'nome-formato'], ['com espaço', 'nome-formato'], ['a.b', 'nome-formato'], ['', 'nome-curto']]) assert.equal(R.erroDoNome(n), e, n);
  assert.equal(R.erroDoNome('Gui_2026'), null, 'maiúscula vira minúscula');
  for (const k of ['nome-curto', 'nome-longo', 'nome-formato', 'nome-em-uso', 'nome-sem-regras', 'sem-rede', 'api']) assert.ok(R.MOTIVO_NOME[k] && !/firebase|token|uid/i.test(R.MOTIVO_NOME[k]), k);
  const b = bancoComRegras(), t = transporte(b, ANA);
  for (const ruim of ['AB', 'ab', 'a-b', 'x'.repeat(21)]) await recusa(t.escrever(`usuarios/${ruim}`, { uid: ANA.uid, em: 1 }), ruim);
  await recusa(t.escrever('usuarios/certo', { uid: ANA.uid, em: 1, extra: 1 }), 'campo a mais');
  await recusa(t.escrever('usuarios/certo', { uid: ANA.uid }), 'sem o instante');
  // as regras publicadas antes da G-266 não têm o ramo: a leitura é recusada e o app explica
  const antigas = { ler: async () => { throw Object.assign(new Error('api'), { status: 401 }); }, escrever: async () => {}, apagar: async () => {} };
  await assert.rejects(R.createNomeDeUsuario({ transporte: { ...antigas, ler: async c => { if (c.startsWith('perfis/')) return null; return antigas.ler(); } }, uid: ANA.uid }).reservar('gui'), /nome-sem-regras/);
  assert.throws(() => R.createNomeDeUsuario({ transporte: t, uid: '../x' }), /uid-invalido/);
});
