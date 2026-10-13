#!/usr/bin/env node
/* R-3 · BI1-2 · Telemetria das sessões para o Painel Estante.
   Cada conversa que trabalha no repositório registra aqui o que o painel precisa saber e o GitHub não conta sozinho:
   a leva (trilha, conversa, história, skills, modelo, tempos, testes, portão, situação), a trilha (espelho do check-in),
   as rotinas agendadas no Claude e os placares da prova de partida. Tudo vai para o ramo `telemetria` (dado, não produto:
   fora da fila e do portão, como `relatos` e `catalogo`); o painel lê pelo `raw.githubusercontent.com`.

   Uso (da raiz do clone, com permissão de push):
     node telemetria.mjs leva   '{"id":"R-3","trilha":"radar","conversa":"radar · Painel Estante · 13/10","situacao":"editando", ...}'
     node telemetria.mjs trilha '{"conversa":"...","trilha":"radar","leva":"R-3","historia":"...","situacao":"editando"}'
     node telemetria.mjs rotina '{"id":"trig_…","nome":"...","quando":"2026-10-13T21:51:00Z","status":"agendada"}'
     node telemetria.mjs placar '{"trilha":"homologacao","motor":112,"formato":"pauper","listas_total":341,"listas_jogam":272,"falhas":0}'
     node telemetria.mjs skills                      # regrava skills.json a partir do registro abaixo
     node telemetria.mjs ler levas|trilhas|rotinas|placares|skills
   Opções: --remoto <url> (padrão: origin do clone) · --pasta <dir> (padrão: .tmp/telemetria) · --sem-push (só grava na pasta).
   Privacidade: linha com e-mail, uid, token ou texto de relato de usuário é recusada antes de gravar. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAMO = 'telemetria';
export const ARQUIVOS = { levas: 'levas.jsonl', trilhas: 'trilhas.json', rotinas: 'rotinas.json', placares: 'placares.jsonl', skills: 'skills.json' };
export const SITUACOES = ['editando', 'na-fila', 'recusada', 'publicada', 'parada', 'abandonada'];
export const PORTOES = ['verde', 'recusada-conflito', 'recusada-guarda', 'recusada-conferencia', 'vermelho', 'instavel'];

/* ---------- registro de skills (retrato do orquestrador v4 · 12/10/2026 + prompt-architect, design-system-extractor, skill-creator) ---------- */
export const SKILLS = [
  { nome: 'mtg-skills-orchestrator', papel: 'Porta de entrada única: refina o pedido, aciona as skills e executa até a entrega, leva a leva', atalhos: ['/mtg-orq', '/mtg-orq-segue', '/mtg-orq-plano', '/mtg-orq-rapido', '/mtg-orq-paralelo', '/mtg-orq-incorpora', '/mtg-orq-mapa'], trilha: null, prefixo: null },
  { nome: 'mtg-engine-architect', papel: 'Motor de regras: mecânicas pela regra numerada, scripts de carta com texto oficial, cobertura de listas, desempenho', atalhos: ['/mtg-motor', '/mtg-motor-rapido', '/mtg-motor-debug', '/mtg-motor-lote', '/mtg-motor-perf', '/mtg-motor-executa'], trilha: 'motor', prefixo: 'M' },
  { nome: 'mtg-bot-architect', papel: 'Shark: força, planos por baralho, mulligan, combate, informação justa', atalhos: ['/mtg-bot', '/mtg-bot-plano', '/mtg-bot-debug', '/mtg-bot-mede', '/mtg-bot-perfil', '/mtg-bot-executa'], trilha: 'bot', prefixo: 'B' },
  { nome: 'mtg-app-design-architect', papel: 'Design system, telas, componentes, fluxos, coleção, listas, scanner, mesa como layout', atalhos: ['/mtg-design', '/mtg-design-rapido', '/mtg-design-critica', '/mtg-design-debug', '/mtg-design-executa'], trilha: 'geral', prefixo: 'G' },
  { nome: 'mtg-table-experience-architect', papel: 'Modo Jogar como experiência: continuidade das cartas, combate desenhado, som, vibração, 60 quadros', atalhos: ['/mtg-mesa', '/mtg-mesa-roadmap', '/mtg-mesa-rapido', '/mtg-mesa-critica', '/mtg-mesa-debug', '/mtg-mesa-executa'], trilha: 'jogabilidade', prefixo: 'J' },
  { nome: 'mtg-data-architect', papel: 'Dados e armazenamento: IndexedDB, backup, Drive, Firebase, ramos de dados, caches, cota, custo', atalhos: ['/mtg-dados', '/mtg-dados-roadmap', '/mtg-dados-rapido', '/mtg-dados-debug', '/mtg-dados-custo', '/mtg-dados-executa'], trilha: 'armazem', prefixo: 'A' },
  { nome: 'mtg-security-architect', papel: 'Segurança e privacidade: HTML seguro, CSP, regras do Firebase, conta, sala, chat, relatos, Actions, repositório', atalhos: ['/mtg-seguranca', '/mtg-seguranca-ameacas', '/mtg-seguranca-roadmap', '/mtg-seguranca-audita', '/mtg-seguranca-debug', '/mtg-seguranca-executa'], trilha: 'protecao', prefixo: 'P' },
  { nome: 'mtg-scale-architect', papel: 'Revisor-chefe de arquitetura, desempenho e custo: parecer de todo diff, orçamentos como teste, projeção de custo', atalhos: ['/mtg-escala', '/mtg-escala-revisa', '/mtg-escala-audita', '/mtg-escala-orcamento', '/mtg-escala-custo', '/mtg-escala-roadmap', '/mtg-escala-executa'], trilha: 'escala', prefixo: 'E' },
  { nome: 'mtg-publish-manager', papel: 'Publicações: leva commits prontos ao main pela fila; conflito, recusa, diário, diagnóstico', atalhos: ['/mtg-publica', '/mtg-publica-lote', '/mtg-publica-conflito', '/mtg-publica-diagnostico', '/mtg-publica-roadmap', '/mtg-publica-pos'], trilha: 'infra', prefixo: 'I' },
  { nome: 'mtg-slice-architect', papel: 'Divide história ou pedido grande na menor fatia que entrega valor e vai ao main sozinha', atalhos: ['/mtg-fatia', '/mtg-fatia-rapido', '/mtg-fatia-historia', '/mtg-fatia-executa'], trilha: null, prefixo: null },
  { nome: 'mtg-parallel-manager', papel: 'Coordena o escopo entre conversas antes da edição: check-in, sobreposição, reserva, diretriz, check-out', atalhos: ['/mtg-paralelo', '/mtg-paralelo-checkin', '/mtg-paralelo-reserva', '/mtg-paralelo-libera', '/mtg-paralelo-mapa', '/mtg-paralelo-reorganiza'], trilha: null, prefixo: null },
  { nome: 'mtg-bi-specialist', papel: 'Visão de gestão: ritmo de levas, intervalo entre publicações, retrabalho, testes, cobertura, cada número com fonte', atalhos: ['/mtg-bi', '/mtg-bi-rapido', '/mtg-bi-painel', '/mtg-bi-decisao', '/mtg-bi-kpis'], trilha: 'radar', prefixo: 'R' },
  { nome: 'prompt-architect', papel: 'Engenharia de prompts: diagnostica e reconstrói prompts, instruções de Projeto e de agente', atalhos: ['/pa-skill', '/pa-rapido', '/pa-completo', '/pa-ab', '/pa-debug', '/pa-agente'], trilha: null, prefixo: null },
  { nome: 'design-system-extractor', papel: 'Extrai a linguagem visual de um artefato em tokens e componentes replicáveis', atalhos: [], trilha: null, prefixo: null },
  { nome: 'skill-creator', papel: 'Cria, melhora e mede skills; é por ele que o orquestrador é atualizado', atalhos: [], trilha: null, prefixo: null }
];

/* ---------- validação (pura, com teste) ---------- */
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const TOKEN = /\b(ya29\.|eyJ[A-Za-z0-9_-]{20,}\.|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{20,}|github_pat_)/;
const CHAVES_PROIBIDAS = /^(uid|token|refresh|refreshtoken|idtoken|senha|password|email|e-mail|relato|texto_do_relato)$/i;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;
const texto = (v, max = 200) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const inteiro = v => Number.isInteger(v) && v >= 0;
const lista = v => Array.isArray(v) && v.every(x => texto(x, 60));

/** Varre valores e chaves em busca do que nunca pode sair da conversa. Devolve a primeira ofensa ou null. */
export function privacidade(obj, caminho = '') {
  if (obj == null) return null;
  if (typeof obj === 'string') {
    if (EMAIL.test(obj)) return `${caminho || 'valor'}: parece e-mail`;
    if (TOKEN.test(obj)) return `${caminho || 'valor'}: parece token ou chave`;
    return null;
  }
  if (Array.isArray(obj)) { for (let i = 0; i < obj.length; i++) { const r = privacidade(obj[i], `${caminho}[${i}]`); if (r) return r; } return null; }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (CHAVES_PROIBIDAS.test(k)) return `${caminho ? caminho + '.' : ''}${k}: chave que nunca entra na telemetria`;
      const r = privacidade(v, caminho ? `${caminho}.${k}` : k); if (r) return r;
    }
  }
  return null;
}

const ESQUEMA_LEVA = {
  id: { obrigatorio: true, ok: v => typeof v === 'string' && /^[A-Z]-\d{1,4}$/.test(v) },
  trilha: { obrigatorio: true, ok: v => typeof v === 'string' && /^[a-z]{2,20}$/.test(v) },
  conversa: { obrigatorio: true, ok: v => texto(v, 80) },
  situacao: { obrigatorio: true, ok: v => SITUACOES.includes(v) },
  historia: { ok: v => texto(v, 120) }, fatia: { ok: v => texto(v, 120) }, plano: { ok: v => texto(v, 120) },
  skills: { ok: lista }, modelo: { ok: v => texto(v, 40) },
  inicio: { ok: v => typeof v === 'string' && ISO.test(v) }, fim: { ok: v => typeof v === 'string' && ISO.test(v) },
  testes_antes: { ok: inteiro }, testes_depois: { ok: inteiro }, instaveis: { ok: inteiro }, bugs_achados: { ok: inteiro }, tentativas_fila: { ok: inteiro }, tokens_estimados: { ok: inteiro },
  portao: { ok: v => PORTOES.includes(v) }, golden_regravado: { ok: v => typeof v === 'boolean' },
  sha: { ok: v => typeof v === 'string' && /^[0-9a-f]{7,40}$/.test(v) },
  estimativa_levas: { ok: v => typeof v === 'number' && v > 0 && v <= 100 }, tamanho: { ok: v => ['½', '1', '2', '3'].includes(v) },
  motivo: { ok: v => texto(v, 200) }, em: { ok: v => typeof v === 'string' && ISO.test(v) }
};
const ESQUEMA_TRILHA = {
  conversa: { obrigatorio: true, ok: v => texto(v, 80) }, trilha: { obrigatorio: true, ok: v => typeof v === 'string' && /^[a-z]{2,20}$/.test(v) },
  leva: { ok: v => typeof v === 'string' && /^[A-Z]-\d{1,4}$/.test(v) }, historia: { ok: v => texto(v, 300) }, fatia: { ok: v => texto(v, 300) },
  modulos: { ok: v => texto(v, 600) }, contrato: { ok: v => texto(v, 300) }, skills: { ok: lista },
  situacao: { obrigatorio: true, ok: v => SITUACOES.includes(v) }, depende_de: { ok: v => texto(v, 300) }, estimativa: { ok: v => texto(v, 120) },
  inicio: { ok: v => typeof v === 'string' && ISO.test(v) }, atualizado: { ok: v => typeof v === 'string' && ISO.test(v) }
};
const ESQUEMA_ROTINA = {
  id: { obrigatorio: true, ok: v => texto(v, 80) }, nome: { obrigatorio: true, ok: v => texto(v, 120) },
  quando: { obrigatorio: true, ok: v => texto(v, 80) }, status: { obrigatorio: true, ok: v => ['agendada', 'executou', 'falhou', 'encerrada', 'pausada'].includes(v) },
  ultima_execucao: { ok: v => typeof v === 'string' && ISO.test(v) }, conversa: { ok: v => texto(v, 80) }, trilha: { ok: v => typeof v === 'string' && /^[a-z]{2,20}$/.test(v) },
  periodicidade: { ok: v => texto(v, 60) }, atualizado: { ok: v => typeof v === 'string' && ISO.test(v) }
};
const ESQUEMA_PLACAR = {
  trilha: { obrigatorio: true, ok: v => typeof v === 'string' && /^[a-z]{2,20}$/.test(v) }, conversa: { ok: v => texto(v, 80) },
  motor: { obrigatorio: true, ok: inteiro }, formato: { ok: v => texto(v, 20) }, sha: { ok: v => typeof v === 'string' && /^[0-9a-f]{7,40}$/.test(v) },
  listas_total: { ok: inteiro }, listas_jogam: { ok: inteiro }, falhas: { ok: inteiro }, partidas: { ok: inteiro },
  regras_cobertas: { ok: inteiro }, regras_parciais: { ok: inteiro }, regras_ausentes: { ok: inteiro },
  cartas_mao: { ok: inteiro }, cartas_leitura: { ok: inteiro }, cartas_tipos: { ok: inteiro }, cartas_manual: { ok: inteiro },
  nota: { ok: v => texto(v, 200) }, em: { ok: v => typeof v === 'string' && ISO.test(v) }
};
const ESQUEMAS = { leva: ESQUEMA_LEVA, trilha: ESQUEMA_TRILHA, rotina: ESQUEMA_ROTINA, placar: ESQUEMA_PLACAR };

/** Valida contra o esquema: chave desconhecida, obrigatória ausente, valor fora da forma e privacidade. Devolve [] quando ok. */
export function valida(tipo, obj) {
  const esquema = ESQUEMAS[tipo];
  if (!esquema) return [`tipo desconhecido: ${tipo}`];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return ['o registro precisa ser um objeto JSON'];
  const erros = [];
  const p = privacidade(obj); if (p) erros.push(p);
  for (const [k, regra] of Object.entries(esquema)) if (regra.obrigatorio && !(k in obj)) erros.push(`falta ${k}`);
  for (const [k, v] of Object.entries(obj)) {
    if (!esquema[k]) { erros.push(`chave desconhecida: ${k}`); continue; }
    if (!esquema[k].ok(v)) erros.push(`${k} fora da forma`);
  }
  return erros;
}

/* ---------- forma dos arquivos (puro, com teste) ---------- */
export const lerJsonl = txt => String(txt || '').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
export const escreverJsonl = linhas => linhas.map(l => JSON.stringify(l)).join('\n') + (linhas.length ? '\n' : '');
/** Uma linha por `chave`: a nova substitui a antiga no mesmo lugar (o histórico de situações fica no `em`), ou entra no fim. */
export function upsert(linhas, nova, chave) {
  const i = linhas.findIndex(l => l[chave] === nova[chave]);
  const saida = linhas.slice();
  if (i >= 0) saida[i] = { ...linhas[i], ...nova }; else saida.push(nova);
  return saida;
}
/** Aplica um registro validado ao conteúdo atual de um arquivo e devolve o conteúdo novo. */
export function aplicar(tipo, atual, registro, agora = new Date().toISOString()) {
  const r = { ...registro };
  if (tipo === 'leva') { r.em = r.em || agora; return escreverJsonl(upsert(lerJsonl(atual), r, 'id')); }
  if (tipo === 'placar') { r.em = r.em || agora; return escreverJsonl([...lerJsonl(atual), r]); }
  if (tipo === 'trilha' || tipo === 'rotina') {
    r.atualizado = r.atualizado || agora;
    const lista = atual ? JSON.parse(atual) : [];
    return JSON.stringify(upsert(Array.isArray(lista) ? lista : [], r, tipo === 'trilha' ? 'conversa' : 'id'), null, 1) + '\n';
  }
  throw new Error('tipo desconhecido: ' + tipo);
}
export const skillsJson = (agora = new Date().toISOString()) => JSON.stringify({ kind: 'estante.telemetria.skills', version: 1, atualizado: agora, skills: SKILLS }, null, 1) + '\n';

/* ---------- git: ramo `telemetria`, acréscimo e push com nova tentativa ---------- */
const git = (pasta, args, opts = {}) => execFileSync('git', ['-C', pasta, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
export function remotoDoClone(raiz) { return git(raiz, ['remote', 'get-url', 'origin']); }
/** Garante um clone raso do ramo `telemetria` na pasta; sem o ramo no remoto, cria um ramo órfão vazio. */
export function preparaPasta({ remoto, pasta }) {
  if (existsSync(join(pasta, '.git'))) {
    try { git(pasta, ['fetch', '--depth', '1', 'origin', RAMO]); git(pasta, ['checkout', '-q', '-B', RAMO, 'origin/' + RAMO]); return 'atualizado'; }
    catch (e) { rmSync(pasta, { recursive: true, force: true }); }
  }
  mkdirSync(pasta, { recursive: true });
  try { execFileSync('git', ['clone', '-q', '--depth', '1', '--branch', RAMO, '--single-branch', remoto, pasta], { stdio: ['ignore', 'pipe', 'pipe'] }); return 'clonado'; }
  catch (e) {
    rmSync(pasta, { recursive: true, force: true }); mkdirSync(pasta, { recursive: true });
    execFileSync('git', ['init', '-q', '-b', RAMO, pasta], { stdio: ['ignore', 'pipe', 'pipe'] });
    git(pasta, ['remote', 'add', 'origin', remoto]);
    return 'novo';
  }
}
/** Grava um registro: lê o arquivo do ramo, aplica, commit e push; se o push for recusado (outra sessão gravou antes), refaz
    sobre o ramo novo, até 5 vezes. Nunca força. */
export function gravar({ tipo, registro, remoto, pasta, semPush = false, agora = () => new Date().toISOString(), autor = 'Telemetria Estante <noreply@anthropic.com>' }) {
  const erros = tipo === 'skills' ? [] : valida(tipo, registro);
  if (erros.length) throw new Error('registro recusado: ' + erros.join('; '));
  const arquivo = tipo === 'skills' ? ARQUIVOS.skills : ARQUIVOS[tipo + (tipo === 'placar' ? 'es' : 's')];
  let ultimo = null;
  for (let tentativa = 1; tentativa <= 5; tentativa++) {
    const estado = preparaPasta({ remoto, pasta });
    const caminho = join(pasta, arquivo);
    const atual = existsSync(caminho) ? readFileSync(caminho, 'utf8') : '';
    const novo = tipo === 'skills' ? skillsJson(agora()) : aplicar(tipo, atual, registro, agora());
    writeFileSync(caminho, novo);
    if (!existsSync(join(pasta, 'README.md'))) writeFileSync(join(pasta, 'README.md'), '# telemetria\n\nDados das sessões para o Painel Estante (`painel.html`), escritos por `node telemetria.mjs …`. Nenhum e-mail, uid ou token entra aqui. Fora da fila e do portão.\n');
    git(pasta, ['add', '-A']);
    const resumo = tipo === 'skills' ? 'skills: catálogo regravado' : `${tipo}: ${registro.id || registro.conversa || registro.trilha} · ${registro.situacao || registro.status || registro.formato || ''}`.trim();
    git(pasta, ['-c', `user.name=${autor.split(' <')[0]}`, '-c', `user.email=${autor.split('<')[1].replace('>', '')}`, 'commit', '-q', '--allow-empty', '-m', `telemetria · ${resumo}`]);
    if (semPush) return { arquivo, tentativa, estado, enviado: false };
    try { git(pasta, ['push', '-q', 'origin', `${RAMO}:${RAMO}`]); return { arquivo, tentativa, estado, enviado: true }; }
    catch (e) { ultimo = e; rmSync(pasta, { recursive: true, force: true }); }
  }
  throw new Error('não consegui enviar depois de 5 tentativas: ' + String(ultimo && ultimo.stderr || ultimo).slice(0, 200));
}

/* ---------- linha de comando ---------- */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  const comando = args[0];
  const raiz = process.cwd();
  const pasta = resolve(opt('--pasta') || join(raiz, '.tmp', 'telemetria'));
  const remoto = opt('--remoto') || remotoDoClone(raiz);
  const semPush = args.includes('--sem-push');
  try {
    if (comando === 'ler') {
      preparaPasta({ remoto, pasta });
      const arquivo = ARQUIVOS[args[1]]; if (!arquivo) throw new Error('o que ler: ' + Object.keys(ARQUIVOS).join('|'));
      const caminho = join(pasta, arquivo); process.stdout.write(existsSync(caminho) ? readFileSync(caminho, 'utf8') : '');
    } else if (['leva', 'trilha', 'rotina', 'placar'].includes(comando)) {
      const bruto = args.slice(1).find(a => a.startsWith('{')); if (!bruto) throw new Error('faltou o registro JSON entre aspas simples');
      const r = gravar({ tipo: comando, registro: JSON.parse(bruto), remoto, pasta, semPush });
      console.log(`✓ ${comando} gravado em ${RAMO}/${r.arquivo}${r.enviado ? ' (enviado)' : ' (só na pasta)'}${r.tentativa > 1 ? `, ${r.tentativa}ª tentativa` : ''}`);
    } else if (comando === 'skills') {
      const r = gravar({ tipo: 'skills', registro: {}, remoto, pasta, semPush });
      console.log(`✓ skills.json regravado em ${RAMO}${r.enviado ? ' (enviado)' : ''}`);
    } else {
      console.log('uso: node telemetria.mjs leva|trilha|rotina|placar \'{…}\' · skills · ler levas|trilhas|rotinas|placares|skills [--remoto url] [--pasta dir] [--sem-push]');
      process.exit(comando ? 1 : 0);
    }
  } catch (e) { console.error('✗ ' + e.message); process.exit(1); }
}
