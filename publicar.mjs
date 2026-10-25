#!/usr/bin/env node
/* =====================================================================
   Q12 · PUBLICAR — o único caminho para o `main`
   Busca o que as outras trilhas publicaram, põe o trabalho local por cima
   (rebase, nunca force), confere que nada delas foi apagado, roda o
   portão e só então envia. Se alguém publicar no meio, recomeça.

     npm run publicar                 pela fila (Q17): rebase, guarda, conferência, fase rápida local e envio para `fila/<leva>`.
                                      O portão inteiro roda no CI, uma vez para todas as levas da fila, e o main avança sozinho.
     npm run publicar -- --esperar    idem, e fica olhando até a leva chegar ao main ou ser recusada
     npm run publicar -- --sem-rapida sem a fase rápida local (a fila pega a queda, 20 min depois)
     npm run publicar -- --situacao   onde está cada leva: na fila, recusada (com o motivo) ou publicada
     npm run publicar -- --conferir   até a guarda e a conferência; não roda teste nem envia
     npm run publicar -- --direto     caminho antigo: portão inteiro neste clone e push no main (para quando a fila
                                      estiver parada; recomeça se outra trilha publicar no meio)
   ===================================================================== */
import { execFileSync, spawnSync, spawn } from 'node:child_process';
import { conferirFaixa, relatar, conferirArvore } from './agregacao.mjs';
import { garantirNavegador } from './portao.mjs';
import { chave, commitsDa, publicados, nomeDoRamo, situacao, PREFIXO_FILA, PREFIXO_RECUSADA } from './fila.mjs';

const soConferir = process.argv.includes('--conferir');
const direto = process.argv.includes('--direto');
const pelaFila = !direto; // Q17 · a fila é o caminho padrão desde a leva I-282 (`--fila` continua aceito e não muda nada)
const esperar = process.argv.includes('--esperar');
const semRapida = process.argv.includes('--sem-rapida');
const soSituacao = process.argv.includes('--situacao');
const MAX_VOLTAS = 6; // Q14 · a volta ficou barata (a fase é interrompida quando o main anda)

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 30 }).trim();
const roda = (cmd, args) => spawnSync(cmd, args, { stdio: 'inherit' }).status === 0;
const para = (msg) => { console.error(`\n✗ ${msg}\nNada foi publicado.`); process.exit(1); };
const passo = (n, t) => console.log(`\n── ${n} · ${t}`);
/** Q14 · roda uma fase do portão olhando o main a cada dois minutos. Se outra trilha publicar no meio, a fase é interrompida
    na hora: o resultado não serviria (o portão precisa rodar sobre o código somado) e esperar o fim custava até 25 minutos. */
const VIGIA_MS = 120000;
function rodaVigiando(args) {
  return new Promise((resolve) => {
    const filho = spawn('npm', args, { stdio: 'inherit', detached: true });
    let andou = false;
    const vigia = setInterval(() => {
      try { if (!roda('git', ['fetch', '--quiet', 'origin', 'main'])) return; if (Number(git('rev-list', '--count', 'HEAD..origin/main'))) { andou = true; try { process.kill(-filho.pid, 'SIGTERM'); } catch (e) { filho.kill('SIGTERM'); } } } catch (e) { /* sem rede agora: a conferência final decide */ }
    }, VIGIA_MS);
    filho.on('close', (codigo) => { clearInterval(vigia); resolve(andou ? 'main-andou' : codigo === 0 ? 'ok' : 'falhou'); });
  });
}

function buscar() {
  const raso = git('rev-parse', '--is-shallow-repository') === 'true';
  if (!roda('git', raso ? ['fetch', '--quiet', '--depth=120', 'origin', 'main'] : ['fetch', '--quiet', 'origin', 'main'])) para('Não consegui buscar o main.');
}

/* ---------- Q17 · fila ---------- */
// Q22 · o aviso de main vermelho (`aviso/main-vermelho`) vem junto: é ele que diz "a sua leva espera, não foi recusada"
const REFS_DA_FILA = [`+refs/heads/${PREFIXO_FILA}*:refs/remotes/origin/${PREFIXO_FILA}*`, `+refs/heads/${PREFIXO_RECUSADA}*:refs/remotes/origin/${PREFIXO_RECUSADA}*`, '+refs/heads/aviso/*:refs/remotes/origin/aviso/*'];
/** Q22 · texto do aviso de main vermelho para a conversa. */
const textoMainVermelho = (a) => `\n⚠ MAIN VERMELHO NO CI desde ${new Date(a.desde * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC (main ${a.base.slice(0, 7)}). Caem no main sozinho:\n${a.quedas.map((q) => `      - ${q.nome}${q.arquivo ? ` (${q.arquivo})` : ''}`).join('\n')}\n  As levas da fila ESPERAM (não são recusadas; não reenvie). Cada rodada roda primeiro só estes testes; o portão inteiro volta quando a trilha dona do teste enviar a correção.`;
const buscarFila = () => roda('git', ['fetch', '--quiet', '--prune', 'origin', ...REFS_DA_FILA]);
const refExiste = (ref) => spawnSync('git', ['rev-parse', '--verify', '--quiet', ref], { stdio: 'ignore' }).status === 0;
/** Commits locais que ainda não estão no main (pela identidade da leva: a fila regrava o sha, não a autoria nem a mensagem). */
function pendentes() { const ja = publicados(process.cwd(), 'origin/main'); return commitsDa(process.cwd(), 'origin/main..HEAD').filter((c) => !ja.has(chave(c))); }
/** Rebase que sabe o que a fila já publicou: os commits locais que já estão no main (com outro sha) saem da frente em vez de
    serem reaplicados (reaplicar duplicaria linha no ROADMAP, que junta os dois lados sozinho). */
function rebasear() {
  const locais = commitsDa(process.cwd(), 'origin/main..HEAD');
  const ja = publicados(process.cwd(), 'origin/main');
  let k = 0; while (k < locais.length && ja.has(chave(locais[k]))) k++;
  if (k) console.log(`${k} commit(s) local(is) já estão no main (publicados pela fila): saem da frente`);
  return roda('git', k ? ['rebase', '--onto', 'origin/main', locais[k - 1].sha] : ['rebase', 'origin/main']);
}
function mostrarSituacao() {
  const s = situacao({ cwd: process.cwd() });
  const levas = (ls) => ls.map((l) => `      ${l.publicado ? `✓ no main ${l.publicado.slice(0, 7)}` : '· aguardando'}  ${l.assunto.slice(0, 90)}`).join('\n');
  console.log(`\nFila de publicação (${s.fila.length} ramo(s), em ordem de chegada):`);
  for (const r of s.fila) console.log(`  ${PREFIXO_FILA}${r.nome}\n${levas(r.levas)}`);
  for (const r of s.recusadas) console.log(`\n  ✗ ${PREFIXO_RECUSADA}${r.nome}\n${levas(r.levas)}\n${r.motivo.split('\n').map((l) => '      ' + l).join('\n')}`);
  if (s.mainVermelho) console.log(textoMainVermelho(s.mainVermelho));
  console.log(`\nNeste clone: ${s.locais.length ? '' : 'nada à frente do main.'}`);
  if (s.locais.length) console.log(levas(s.locais));
  return s;
}
if (soSituacao) { buscar(); buscarFila(); mostrarSituacao(); process.exit(0); }

if (git('status', '--porcelain')) para('Há alteração fora de commit. Faça o commit da leva (com o rodapé `Trilha:`) antes de publicar.');

for (let volta = 1; volta <= MAX_VOLTAS; volta++) {
  passo(1, `buscar o main${volta > 1 ? ` (volta ${volta}: outra trilha publicou no meio)` : ''}`);
  buscar();
  const atras = Number(git('rev-list', '--count', 'HEAD..origin/main'));
  const afrente = Number(git('rev-list', '--count', 'origin/main..HEAD'));
  if (!afrente) { console.log('Nada novo para publicar: o main já tem tudo o que está aqui.'); process.exit(0); }
  console.log(`${afrente} commit(s) local(is) · ${atras} commit(s) de outras trilhas para receber`);

  if (atras) {
    passo(2, 'pôr o trabalho local em cima do que as outras trilhas publicaram');
    console.log(git('log', '--format=  recebe %h %s', 'HEAD..origin/main').split('\n').map((l) => l.slice(0, 110)).join('\n'));
    if (!rebasear()) {
      para([
        'Conflito no rebase. Resolva ficando com OS DOIS lados (o da outra trilha e o seu):',
        '  1. abra cada arquivo com <<<<<<< e monte a versão que contém as duas entregas;',
        '  2. git add <arquivo> && git rebase --continue;',
        '  3. npm run publicar de novo.',
        'Nunca resolva com --ours/--theirs no arquivo inteiro, nem com push --force.',
        'Para desistir: git rebase --abort.',
      ].join('\n'));
    }
  }

  passo(3, 'guarda de agregação');
  const { achados, novos } = conferirFaixa('origin/main', 'HEAD');
  if (achados.length) { console.error('\n' + relatar(achados)); para(`Guarda de agregação: ${achados.length} achado(s).`); }
  console.log(`agregação ✓ ${novos.length} commit(s) só somam ao main`);
  // Q16 · o que derrubaria o portão por descuido cai aqui, em segundos: id repetido no ROADMAP, goldens de outra versão do motor
  // (leva repetida e prefixo já saíram na guarda, acima) e navegador da fase de tela ausente
  const antes = conferirArvore();
  if (antes.length) { console.error('\n' + antes.map((a) => a.texto).join('\n\n')); para(`Conferência antes do portão: ${antes.length} achado(s).`); }
  const nav = await garantirNavegador();
  if (nav.erro && !soConferir) para(nav.erro);
  console.log(`antes do portão ✓ ids da ordem sem repetição · goldens na versão do motor${nav.erro ? '' : ' · navegador da fase de tela no lugar'}`);
  if (soConferir) { console.log('\n--conferir: parei antes do portão e do envio.'); process.exit(0); }

  if (pelaFila) { await enviarParaAFila(); process.exit(0); }

  // Q14 · o mesmo portão do `npm test`, em duas fases (portao.mjs): a rápida primeiro, a de tela sozinha depois
  let recomeca = false;
  for (const [fase, nome] of [['test:rapido', 'fase rápida'], ['test:e2e', 'fase de tela']]) {
    passo(4, `portão de release · ${nome} (npm run ${fase})`);
    const r = await rodaVigiando(['run', '-s', fase]);
    if (r === 'main-andou') { console.log(`\nOutra trilha publicou durante a ${nome}: interrompi e recomeço em cima do main novo.`); recomeca = true; break; }
    if (r !== 'ok') para('Portão vermelho.');
  }
  if (recomeca) continue;

  passo(5, 'enviar');
  buscar();
  if (Number(git('rev-list', '--count', 'HEAD..origin/main'))) { console.log('O main andou enquanto o portão rodava. Recomeçando.'); continue; }
  if (roda('git', ['push', 'origin', 'HEAD:main'])) {
    console.log(`\n✓ Publicado: ${git('rev-parse', '--short', 'HEAD')}. O Pages publica o main sozinho; confira o ✓ do Portão de release em Actions.`);
    process.exit(0);
  }
  console.log('O envio foi recusado (alguém publicou antes). Recomeçando.');
}
/** Q17 · envia os commits pendentes para `fila/<leva>`; o portão inteiro roda no CI sobre a soma da fila. */
async function enviarParaAFila() {
  const meus = pendentes();
  if (!meus.length) { console.log('Nada novo para a fila: o main já tem tudo o que está aqui.'); return; }
  const nome = nomeDoRamo(meus);
  buscarFila();
  const naFila = `origin/${PREFIXO_FILA}${nome}`;
  let trava = '';
  if (refExiste(naFila)) {
    // o nome do ramo é a reserva do número: se já existe com levas que não são as deste clone, outra conversa chegou antes
    const minhas = new Set(meus.map(chave));
    const estranhos = commitsDa(process.cwd(), `origin/main..${naFila}`).filter((c) => !minhas.has(chave(c)));
    if (estranhos.length) para(`Já existe ${PREFIXO_FILA}${nome} na fila, de outra conversa:\n    ${estranhos.map((c) => c.assunto.slice(0, 100)).join('\n    ')}\nO número ${nome} está reservado por ela. Renumere a sua leva (commit e ROADMAP) e envie de novo.`);
    trava = `--force-with-lease=refs/heads/${PREFIXO_FILA}${nome}:${git('rev-parse', naFila)}`; // é a mesma leva, reenviada depois de um rebase
  }
  if (!semRapida) {
    passo(4, 'fase rápida local (a fila roda o portão inteiro; aqui a queda barata aparece antes de ocupar a fila)');
    if (!roda('npm', ['run', '-s', 'test:rapido'])) para('Fase rápida vermelha. Nada foi para a fila.');
  }
  passo(5, `enviar para ${PREFIXO_FILA}${nome}`);
  if (refExiste(`origin/${PREFIXO_RECUSADA}${nome}`)) roda('git', ['push', '--quiet', 'origin', `:refs/heads/${PREFIXO_RECUSADA}${nome}`]); // reenvio de leva recusada: o aviso antigo sai
  if (!roda('git', ['push', ...(trava ? [trava] : []), 'origin', `HEAD:refs/heads/${PREFIXO_FILA}${nome}`])) para(`Não consegui enviar para ${PREFIXO_FILA}${nome}.`);
  const enviado = git('rev-parse', 'HEAD');
  console.log(`\n✓ Na fila: ${PREFIXO_FILA}${nome} (${meus.length} commit(s)). O fluxo "Fila de publicação" soma as levas da fila, roda um portão e avança o main.`);
  console.log('  Pode seguir trabalhando neste clone. Para saber onde está: npm run publicar -- --situacao');
  if (!esperar) return;
  const inicio = Date.now(), TETO_MS = 120 * 60000;
  let avisou = false;
  for (;;) {
    await new Promise((r) => setTimeout(r, 45000));
    if (!roda('git', ['fetch', '--quiet', 'origin', 'main']) || !buscarFila()) continue;
    // a recusa é deste envio só se o aviso foi gravado por cima do commit enviado (aviso velho de um envio anterior não conta:
    // as conversas de nuvem não conseguem apagá-lo, quem limpa é a fila)
    if (refExiste(`origin/${PREFIXO_RECUSADA}${nome}`) && git('rev-parse', `origin/${PREFIXO_RECUSADA}${nome}^`) === enviado) { console.error(`\n✗ Recusada pela fila:\n${git('log', '-1', '--format=%b', `origin/${PREFIXO_RECUSADA}${nome}`)}`); process.exit(1); }
    const mv = situacao({ cwd: process.cwd() }).mainVermelho;
    if (mv && !avisou) { console.log(textoMainVermelho(mv)); avisou = true; }
    if (!pendentes().length) {
      rebasear();
      console.log(`\n✓ Publicado pela fila: main em ${git('rev-parse', '--short', 'origin/main')} (${Math.round((Date.now() - inicio) / 60000)} min de espera). O clone foi alinhado ao main.`);
      return;
    }
    if (Date.now() - inicio > TETO_MS) para('Duas horas sem resultado da fila. Veja o fluxo "Fila de publicação" em Actions e rode: npm run publicar -- --situacao');
  }
}

para(`O main mudou ${MAX_VOLTAS} vezes seguidas durante o portão. Combine a vez com as outras trilhas e rode de novo.`);
