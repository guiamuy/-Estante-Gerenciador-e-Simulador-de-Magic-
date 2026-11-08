#!/usr/bin/env node
/* =====================================================================
   Q12 · PUBLICAR — o único caminho para o `main`
   Busca o que as outras trilhas publicaram, põe o trabalho local por cima
   (rebase, nunca force), confere que nada delas foi apagado, roda o
   portão e só então envia. Se alguém publicar no meio, recomeça.

   I-323 (decisão do dono, 07/11/2026): ninguém envia para o `main`. A leva vai para `claude/<leva>`, abre um pull request,
   a Vercel monta a prévia e o dono decide. Só o merge do PR (pedido pelo dono) muda o `main`.

     npm run publicar                 rebase, guarda, conferência, portão inteiro NESTE clone (as duas fases), envio para
                                      `claude/<leva>` e pull request (com o gh; sem ele, mostra o link para abrir o PR)
     npm run publicar -- --esperar    idem, e espera a prévia da Vercel para mostrar o link
     npm run publicar -- --situacao   pull requests abertos e o que este clone tem à frente do main
     npm run publicar -- --conferir   até a guarda e a conferência; não roda teste nem envia
     npm run publicar -- --merge <n>  junta o PR n no main (só quando o dono pedir): exige o ramo em cima do main de agora,
                                      passa a guarda de novo e faz o merge com rebase pelo GitHub
     npm run publicar -- --sem-rapida / --sem-tela   pula uma fase do portão (só para teste do próprio publicar)
     npm run publicar -- --fila       caminho da fila (Q17), desligado desde a I-323; fica só para os testes da fila
   ===================================================================== */
import { execFileSync, spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { conferirFaixa, relatar, conferirArvore } from './agregacao.mjs';
import { garantirNavegador } from './portao.mjs';
import { chave, commitsDa, publicados, nomeDoRamo, situacao, PREFIXO_FILA, PREFIXO_RECUSADA } from './fila.mjs';

const soConferir = process.argv.includes('--conferir');
const direto = process.argv.includes('--direto');
const pelaFila = process.argv.includes('--fila'); // I-323 · a fila (Q17) saiu do caminho padrão: o padrão é o pull request
const esperar = process.argv.includes('--esperar');
const semRapida = process.argv.includes('--sem-rapida');
const semTela = process.argv.includes('--sem-tela');
const soSituacao = process.argv.includes('--situacao');
const alvoMerge = (() => { const i = process.argv.indexOf('--merge'); return i > 0 ? (process.argv[i + 1] || '') : null; })();
const PREFIXO_PR = 'claude/';
const ENDERECO_PRODUCAO = 'https://estante-magic.vercel.app';
/* I-323 · cada prévia da Vercel tem um endereço novo, e o login com Google só aceita endereço cadastrado (sem curinga).
   Por isso a prévia mais recente ganha também este endereço fixo, cadastrado uma vez no Google e no Firebase. */
const ENDERECO_PREVIA = 'https://estante-magic-previa.vercel.app';
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
/* ---------- I-323 · pull request ---------- */
const temGh = () => !!repoDoOrigin() && spawnSync('gh', ['auth', 'status'], { stdio: 'ignore' }).status === 0; // origin fora do GitHub (testes): sem PR
const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 1 << 26 }).trim();
function repoDoOrigin() {
  const m = git('remote', 'get-url', 'origin').match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?\/?$/);
  return m ? m[1] : '';
}
const ramoRemotoExiste = (ramo) => spawnSync('git', ['ls-remote', '--exit-code', '--heads', 'origin', ramo], { stdio: 'ignore' }).status === 0;
/** Link da prévia da Vercel para um commit: a Vercel registra um "deployment" no GitHub por commit do ramo. */
function previaDe(repo, sha) {
  try {
    for (const d of JSON.parse(gh('api', `repos/${repo}/deployments?sha=${sha}&per_page=10`))) {
      for (const s of JSON.parse(gh('api', `repos/${repo}/deployments/${d.id}/statuses?per_page=5`))) {
        if (s.state === 'success' && (s.environment_url || s.target_url)) return s.environment_url || s.target_url;
        if (s.state === 'failure' || s.state === 'error') return { falhou: s.target_url || s.log_url || '' };
      }
    }
  } catch (e) { /* sem rede ou sem permissão agora: tenta de novo */ }
  return null;
}
function mostrarPRs() {
  if (!temGh()) { console.log('Sem o gh autenticado não consigo listar os pull requests. Veja em https://github.com/' + repoDoOrigin() + '/pulls'); return; }
  const prs = JSON.parse(gh('pr', 'list', '--state', 'open', '--json', 'number,title,headRefName,url'));
  console.log(`\nPull requests abertos (${prs.length}):`);
  for (const p of prs) console.log(`  #${p.number}  ${p.headRefName}  ${p.title.slice(0, 80)}\n        ${p.url}`);
}
if (soSituacao && pelaFila) { buscar(); buscarFila(); mostrarSituacao(); process.exit(0); }
if (soSituacao) {
  buscar(); mostrarPRs();
  const locais = pendentes();
  console.log(`\nNeste clone: ${locais.length ? '' : 'nada à frente do main.'}`);
  for (const c of locais) console.log(`      · ${c.assunto.slice(0, 100)}`);
  process.exit(0);
}
if (direto) para('O caminho direto (push no main) acabou na I-323: ninguém envia para o main. Rode `npm run publicar` (pull request com prévia) e peça ao dono o merge.');

if (alvoMerge !== null) {
  // I-323 · o merge é o único jeito de mudar o main, e só quando o dono pede
  if (!alvoMerge) para('Diga qual pull request: npm run publicar -- --merge <número>');
  if (!temGh()) para('O merge precisa do gh autenticado (gh auth login). Sem ele, o dono junta pelo botão "Rebase and merge" do PR.');
  buscar();
  const pr = JSON.parse(gh('pr', 'view', alvoMerge, '--json', 'number,state,headRefName,headRefOid,url,title'));
  if (pr.state !== 'OPEN') para(`O PR #${pr.number} não está aberto (${pr.state}).`);
  roda('git', ['fetch', '--quiet', 'origin', `+refs/heads/${pr.headRefName}:refs/remotes/origin/${pr.headRefName}`]);
  const ramo = `origin/${pr.headRefName}`;
  if (git('rev-parse', ramo) !== pr.headRefOid) para('O ramo do PR mudou durante a conferência. Rode de novo.');
  if (Number(git('rev-list', '--count', `${ramo}..origin/main`))) {
    para(`O main andou desde que o PR #${pr.number} foi testado. Atualize o ramo antes do merge:\n  git switch ${pr.headRefName} && npm run publicar\n(rebase, guarda, portão e novo envio; a prévia é refeita). Depois peça o merge de novo.`);
  }
  const { achados } = conferirFaixa('origin/main', ramo);
  if (achados.length) { console.error('\n' + relatar(achados)); para(`Guarda de agregação: ${achados.length} achado(s).`); }
  passo(1, `merge do PR #${pr.number} · ${pr.title.slice(0, 80)}`);
  if (!roda('gh', ['pr', 'merge', String(pr.number), '--rebase', '--delete-branch'])) para('O GitHub recusou o merge.');
  console.log(`\n✓ No main. A Vercel publica em ${ENDERECO_PRODUCAO} em um ou dois minutos.`);
  process.exit(0);
}

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
  // I-308 · pela fila, este clone só roda a fase rápida (que não abre navegador); a fase de tela roda no CI. Sem o Chromium aqui,
  // só o caminho direto (que roda as duas fases no clone) para. Antes o modo fila parava também, e o Q17 do fila.unit, que roda
  // este script de verdade, caiu no job `portao` do CI (sem navegador desde a I-306) e deixou o main vermelho (I-307).
  // I-323 · sem a fila, a fase de tela roda aqui: sem o Chromium, o pull request não sai (a não ser com --sem-tela)
  if (nav.erro && !pelaFila && !semTela && !soConferir) para(nav.erro);
  if (nav.erro && pelaFila) console.log(`aviso: ${nav.erro} Pela fila isso não impede o envio (a fase de tela roda no CI).`);
  console.log(`antes do portão ✓ ids da ordem sem repetição · goldens na versão do motor${nav.erro ? '' : ' · navegador da fase de tela no lugar'}`);
  if (soConferir) { console.log('\n--conferir: parei antes do portão e do envio.'); process.exit(0); }

  if (pelaFila) { await enviarParaAFila(); process.exit(0); }

  // Q14 · o mesmo portão do `npm test`, em duas fases (portao.mjs): a rápida primeiro, a de tela sozinha depois
  // I-323 · o portão inteiro roda neste clone (não há mais CI). Se o main andar no meio, o PR sai assim mesmo: o merge exige
  // o ramo em cima do main de agora, e aí o publicar roda de novo sobre a soma.
  // o portão pelo Node, não pelo npm: no Windows o npm é npm.cmd e o spawn sem shell não o acha
  const fases = [['rapido', 'fase rápida', semRapida], ['e2e', 'fase de tela', semTela]].filter((f) => !f[2]);
  for (const [fase, nome] of fases) {
    passo(4, `portão de release · ${nome} (node portao.mjs ${fase})`);
    if (!roda(process.execPath, [fileURLToPath(new URL('./portao.mjs', import.meta.url)), fase])) para('Portão vermelho. Nada foi enviado.');
  }
  await enviarParaPR();
  process.exit(0);
}

/** I-323 · envia os commits pendentes para `claude/<leva>` e abre (ou atualiza) o pull request. Nunca toca o main. */
async function enviarParaPR() {
  const meus = pendentes();
  if (!meus.length) { console.log('Nada novo: o main já tem tudo o que está aqui.'); return; }
  const nome = nomeDoRamo(meus);
  const ramo = `${PREFIXO_PR}${nome}`;
  let trava = '';
  if (ramoRemotoExiste(ramo)) {
    roda('git', ['fetch', '--quiet', 'origin', `+refs/heads/${ramo}:refs/remotes/origin/${ramo}`]);
    // o nome do ramo é a reserva do número: com levas que não são as deste clone, outra conversa chegou antes
    const minhas = new Set(meus.map(chave));
    const estranhos = commitsDa(process.cwd(), `origin/main..origin/${ramo}`).filter((c) => !minhas.has(chave(c)));
    if (estranhos.length) para(`Já existe ${ramo}, de outra conversa:\n    ${estranhos.map((c) => c.assunto.slice(0, 100)).join('\n    ')}\nO número ${nome} está reservado por ela. Renumere a sua leva (commit e ROADMAP) e envie de novo.`);
    // é a mesma leva, reenviada depois de um rebase: substitui só se ninguém mexeu no ramo desde então
    trava = `--force-with-lease=refs/heads/${ramo}:${git('rev-parse', `origin/${ramo}`)}`;
  }
  passo(5, `enviar para ${ramo}`);
  if (!roda('git', ['push', ...(trava ? [trava] : []), 'origin', `HEAD:refs/heads/${ramo}`])) para(`Não consegui enviar para ${ramo}.`);
  const enviado = git('rev-parse', 'HEAD');
  const repo = repoDoOrigin();
  console.log(`\n✓ Enviado: ${ramo} (${meus.length} commit(s)). O main não mudou.`);
  if (!temGh()) {
    console.log(`  Abra o pull request: https://github.com/${repo}/compare/main...${ramo}?expand=1`);
    console.log('  A Vercel monta a prévia sozinha e comenta o link no PR. Mostre o link ao dono e espere o "pode fazer merge".');
    return;
  }
  passo(6, 'pull request');
  const aberto = JSON.parse(gh('pr', 'list', '--head', ramo, '--state', 'open', '--json', 'number,url'))[0];
  let url = aberto && aberto.url;
  if (!url) {
    const corpo = [...meus.map((c) => `- ${c.assunto}`), '', `Prévia: a Vercel comenta o link aqui quando terminar. Produção: ${ENDERECO_PRODUCAO} (só depois do merge).`, '', '🤖 Generated with [Claude Code](https://claude.com/claude-code)'].join('\n');
    url = gh('pr', 'create', '--base', 'main', '--head', ramo, '--title', meus[meus.length - 1].assunto.slice(0, 240), '--body', corpo);
  }
  console.log(`✓ Pull request: ${url}`);
  if (!esperar) { console.log('  A prévia sai em um ou dois minutos (comentário da Vercel no PR). Para esperar por ela: npm run publicar -- --esperar'); return; }
  const inicio = Date.now();
  for (;;) {
    const p = previaDe(repo, enviado);
    if (typeof p === 'string') {
      // a CLI da Vercel (logada) aponta o endereço fixo para esta prévia; sem ela (nuvem), a conversa aponta pelo conector da Vercel (I-326)
      const fixo = spawnSync('vercel', ['alias', 'set', p, new URL(ENDERECO_PREVIA).host], { stdio: 'ignore', shell: process.platform === 'win32' }).status === 0;
      console.log(fixo
        ? `\n✓ Prévia: ${ENDERECO_PREVIA}  (endereço fixo, com login Google; esta montagem: ${p})`
        : `\n✓ Prévia: ${p}\n  (sem a CLI da Vercel aqui: aponte o endereço fixo ${ENDERECO_PREVIA} para esta prévia pelo conector da Vercel antes de mostrar ao dono; neste endereço próprio o login com Google não funciona)`);
      console.log(`  Mostre ao dono. Merge só quando ele pedir: npm run publicar -- --merge ${url.split('/').pop()}`);
      return;
    }
    if (p && p.falhou !== undefined) para(`A Vercel não conseguiu montar a prévia. Veja: ${p.falhou}`);
    if (Date.now() - inicio > 15 * 60000) { console.log('\nQuinze minutos sem prévia. Veja o comentário da Vercel no PR.'); return; }
    await new Promise((r) => setTimeout(r, 20000));
  }
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
