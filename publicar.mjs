#!/usr/bin/env node
/* =====================================================================
   Q12 · PUBLICAR — o único caminho para o `main`
   Busca o que as outras trilhas publicaram, põe o trabalho local por cima
   (rebase, nunca force), confere que nada delas foi apagado, roda o
   portão e só então envia. Se alguém publicar no meio, recomeça.

     npm run publicar                 fluxo completo
     npm run publicar -- --conferir   até a guarda; não roda o portão nem envia
   ===================================================================== */
import { execFileSync, spawnSync } from 'node:child_process';
import { conferirFaixa, relatar } from './agregacao.mjs';

const soConferir = process.argv.includes('--conferir');
const MAX_VOLTAS = 4;

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 30 }).trim();
const roda = (cmd, args) => spawnSync(cmd, args, { stdio: 'inherit' }).status === 0;
const para = (msg) => { console.error(`\n✗ ${msg}\nNada foi publicado.`); process.exit(1); };
const passo = (n, t) => console.log(`\n── ${n} · ${t}`);

function buscar() {
  const raso = git('rev-parse', '--is-shallow-repository') === 'true';
  if (!roda('git', raso ? ['fetch', '--quiet', '--depth=120', 'origin', 'main'] : ['fetch', '--quiet', 'origin', 'main'])) para('Não consegui buscar o main.');
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
    if (!roda('git', ['rebase', 'origin/main'])) {
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
  if (soConferir) { console.log('\n--conferir: parei antes do portão e do envio.'); process.exit(0); }

  passo(4, 'portão de release (npm test)');
  if (!roda('npm', ['test'])) para('Portão vermelho.');

  passo(5, 'enviar');
  buscar();
  if (Number(git('rev-list', '--count', 'HEAD..origin/main'))) { console.log('O main andou enquanto o portão rodava. Recomeçando.'); continue; }
  if (roda('git', ['push', 'origin', 'HEAD:main'])) {
    console.log(`\n✓ Publicado: ${git('rev-parse', '--short', 'HEAD')}. O Pages publica o main sozinho; confira o ✓ do Portão de release em Actions.`);
    process.exit(0);
  }
  console.log('O envio foi recusado (alguém publicou antes). Recomeçando.');
}
para(`O main mudou ${MAX_VOLTAS} vezes seguidas durante o portão. Combine a vez com as outras trilhas e rode de novo.`);
