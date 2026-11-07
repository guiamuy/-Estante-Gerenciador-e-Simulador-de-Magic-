/* I-324 · /dados/<ramo>/<arquivo> no site da Vercel: lê o arquivo do ramo de dados no GitHub e devolve com cache na Vercel.
   Os robôs seguem gravando nos ramos (noticias, catalogo, artes, relatos); só o leitor mudou. Com o repositório privado,
   a leitura usa GITHUB_DADOS_TOKEN (token só de leitura, guardado na Vercel). Só os ramos públicos do app: a telemetria
   (dados de pessoas) nunca passa por aqui. */
export const REPO = 'guiamuy/-Estante-Gerenciador-e-Simulador-de-Magic-';
/** Ramo → segundos que a Vercel guarda a cópia antes de buscar de novo (o app já guarda a dele no aparelho). */
export const RAMOS = { noticias: 300, catalogo: 1800, artes: 3600, relatos: 120 };
const TIPOS = { json: 'application/json; charset=utf-8', csv: 'text/csv; charset=utf-8', bin: 'application/octet-stream', md: 'text/markdown; charset=utf-8', txt: 'text/plain; charset=utf-8' };

/** Divide "ramo/arquivo" e recusa o que não é de um ramo permitido ou tenta sair dele. */
export function alvo(caminho) {
  const partes = String(caminho || '').split('/');
  const ramo = partes.shift();
  if (!Object.prototype.hasOwnProperty.call(RAMOS, ramo) || !partes.length) return null;
  if (!partes.every((p) => /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(p) && !p.includes('..'))) return null;
  return { ramo, arquivo: partes.join('/') };
}

const resposta = (corpo, status, cache) => new Response(corpo, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': cache } });

export async function GET(request) {
  const a = alvo(new URL(request.url).searchParams.get('caminho'));
  if (!a) return resposta('não encontrado', 404, 'public, max-age=0, s-maxage=3600');
  const token = process.env.GITHUB_DADOS_TOKEN;
  let r;
  try {
    r = await fetch(`https://raw.githubusercontent.com/${REPO}/${a.ramo}/${a.arquivo}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  } catch (e) {
    return resposta('GitHub fora do ar', 502, 'no-store');
  }
  if (!r.ok) return r.status === 404 ? resposta('não encontrado', 404, 'public, max-age=0, s-maxage=60') : resposta(`GitHub respondeu ${r.status}`, 502, 'no-store');
  const ext = a.arquivo.split('.').pop();
  return new Response(r.body, { status: 200, headers: {
    'content-type': TIPOS[ext] || 'application/octet-stream',
    'cache-control': `public, max-age=0, s-maxage=${RAMOS[a.ramo]}, stale-while-revalidate=86400`,
  } });
}
