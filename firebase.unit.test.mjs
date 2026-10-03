// Leva 134 · U14 parte 3 · transporte Firebase (REST + fluxo de eventos) com rede e EventSource falsos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { online: O } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const tique = () => new Promise(r => setTimeout(r, 0));

/** Banco falso: um objeto; REST e fluxo de eventos por cima dele. */
function bancoFalso({ fora = false } = {}) {
  let dados = {}; const fontes = new Set(); const chamadas = []; let n = 0;
  const desce = (o, seg) => { for (const k of seg) { if (!o || typeof o !== 'object' || !(k in o)) return null; o = o[k]; } return o === undefined ? null : o; };
  const poe = (seg, v) => { if (!seg.length) { dados = v || {}; return; } let o = dados; for (const k of seg.slice(0, -1)) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; } if (v === null) delete o[seg[seg.length - 1]]; else o[seg[seg.length - 1]] = v; };
  const emite = (tipo, caminhoAbs, data) => { for (const f of fontes) { const seg = f.seg; if (caminhoAbs.slice(0, seg.length).join('/') !== seg.join('/')) continue; const rel = '/' + caminhoAbs.slice(seg.length).join('/'); f.dispara(tipo, { path: rel, data }); } };
  const fetch = async (url, init = {}) => {
    const m = url.match(/^https:\/\/x\.firebaseio\.com\/(.*)\.json$/); const seg = m[1].split('/').filter(Boolean); const metodo = init.method || 'GET';
    chamadas.push(metodo + ' /' + seg.join('/'));
    if (fora) throw new TypeError('Failed to fetch');
    const corpo = init.body ? JSON.parse(init.body) : undefined;
    const ok = v => ({ ok: true, status: 200, text: async () => (v === null || v === undefined ? '' : JSON.stringify(v)) });
    if (metodo === 'GET') return ok(desce(dados, seg));
    if (metodo === 'PUT') { poe(seg, corpo); emite('put', seg, corpo); return ok(corpo); }
    if (metodo === 'PATCH') { for (const [k, v] of Object.entries(corpo)) poe([...seg, ...k.split('/')], v); emite('patch', seg, corpo); return ok(corpo); }
    if (metodo === 'POST') { const chave = '-N' + String(++n).padStart(4, '0'); poe([...seg, chave], corpo); emite('put', [...seg, chave], corpo); return ok({ name: chave }); }
    if (metodo === 'DELETE') { poe(seg, null); emite('put', seg, null); return ok(null); }
    return { ok: false, status: 405, text: async () => '' };
  };
  class EventSourceFalso {
    constructor(url) { const m = url.match(/^https:\/\/x\.firebaseio\.com\/(.*)\.json$/); this.seg = m[1].split('/').filter(Boolean); this.ouv = {}; fontes.add(this); setTimeout(() => { this.dispara('open'); this.dispara('put', { path: '/', data: desce(dados, this.seg) }); }, 0); }
    addEventListener(t, f) { (this.ouv[t] = this.ouv[t] || []).push(f); }
    dispara(t, payload) { for (const f of this.ouv[t] || []) f(payload === undefined ? {} : { data: JSON.stringify(payload) }); }
    close() { fontes.delete(this); this.fechado = true; }
    /** Simula queda e volta: o Firebase manda o nó inteiro de novo ao reconectar. */
    reconecta() { this.dispara('error'); setTimeout(() => { this.dispara('open'); this.dispara('put', { path: '/', data: desce(dados, this.seg) }); }, 0); }
  }
  return { fetch, EventSourceFalso, chamadas, dados: () => dados, fontes };
}

test('Leva 134 · REST: ler, escrever, atualizar, empurrar (chave do servidor), apagar; URL com barra no fim', async () => {
  const B = bancoFalso();
  const tr = O.transporteFirebase({ url: 'https://x.firebaseio.com/', fetch: B.fetch, EventSource: B.EventSourceFalso });
  assert.equal(tr.kind, 'firebase');
  assert.equal(await tr.ler('salas/ESTA-AAAA'), null);
  await tr.escrever('salas/ESTA-AAAA', { estado: 'esperando', anfitriao: { nome: 'Ana' } });
  await tr.atualizar('salas/ESTA-AAAA', { estado: 'pronta', convidado: { nome: 'Bia' } });
  assert.deepEqual(J(await tr.ler('salas/ESTA-AAAA')), { estado: 'pronta', anfitriao: { nome: 'Ana' }, convidado: { nome: 'Bia' } });
  const k = await tr.empurrar('salas/ESTA-AAAA/acoes', { antes: 0 }); assert.match(k, /^-N/);
  assert.deepEqual(Object.keys((await tr.ler('salas/ESTA-AAAA')).acoes), [k]);
  await tr.apagar('salas/ESTA-AAAA'); assert.equal(await tr.ler('salas/ESTA-AAAA'), null);
  assert.deepEqual(B.chamadas.slice(0, 3), ['GET /salas/ESTA-AAAA', 'PUT /salas/ESTA-AAAA', 'PATCH /salas/ESTA-AAAA']);
});

test('Leva 134 · fluxo de eventos: o primeiro put traz o nó, patch e put parciais atualizam a réplica, parar fecha', async () => {
  const B = bancoFalso();
  const tr = O.transporteFirebase({ url: 'https://x.firebaseio.com', fetch: B.fetch, EventSource: B.EventSourceFalso });
  await tr.escrever('salas/ESTA-BBBB', { estado: 'esperando', acoes: {} });
  const vistos = []; const parar = tr.ouvir('salas/ESTA-BBBB', v => vistos.push(J(v)));
  await tique(); await tique();
  assert.deepEqual(vistos.at(-1).estado, 'esperando');
  await tr.atualizar('salas/ESTA-BBBB', { estado: 'pronta', convidado: { nome: 'Bia' } });
  assert.deepEqual(vistos.at(-1), { estado: 'pronta', acoes: {}, convidado: { nome: 'Bia' } });
  const k = await tr.empurrar('salas/ESTA-BBBB/acoes', { antes: 0, p: 0 });
  assert.deepEqual(vistos.at(-1).acoes, { [k]: { antes: 0, p: 0 } }, 'put parcial entra no lugar certo');
  await tr.atualizar('salas/ESTA-BBBB/presenca', { 1: 123 });
  assert.deepEqual(vistos.at(-1).presenca, { 1: 123 }, 'patch num filho que não existia');
  parar(); const antes = vistos.length;
  await tr.atualizar('salas/ESTA-BBBB', { estado: 'jogando' });
  assert.equal(vistos.length, antes, 'depois de parar, nada chega');
  assert.equal([...B.fontes].length, 0, 'a fonte foi fechada');
});

test('Leva 134 · queda e volta: ligado() acompanha, e ao reconectar a réplica é refeita pelo nó inteiro', async () => {
  const B = bancoFalso();
  const tr = O.transporteFirebase({ url: 'https://x.firebaseio.com', fetch: B.fetch, EventSource: B.EventSourceFalso });
  await tr.escrever('salas/ESTA-CCCC', { estado: 'jogando' });
  const estados = []; tr.aoMudarLigacao(l => estados.push(l));
  const vistos = []; tr.ouvir('salas/ESTA-CCCC', v => vistos.push(J(v))); await tique(); await tique();
  const fonte = [...B.fontes][0];
  fonte.reconecta(); assert.equal(tr.ligado(), false); assert.deepEqual(estados, [false]);
  // enquanto estava fora, alguém escreveu direto no banco (sem evento): ao voltar, o put inteiro traz
  B.dados().salas['ESTA-CCCC'].estado = 'encerrada';
  await tique(); await tique();
  assert.equal(tr.ligado(), true); assert.deepEqual(estados, [false, true]);
  assert.equal(vistos.at(-1).estado, 'encerrada');
});

test('Leva 134 · sem rede: REST falha com nome, ligado() cai; a sala inteira funciona por cima do Firebase', async () => {
  const fora = O.transporteFirebase({ url: 'https://x.firebaseio.com', fetch: bancoFalso({ fora: true }).fetch, EventSource: class { addEventListener() {} close() {} } });
  await assert.rejects(fora.ler('salas/X'), /sem-rede/); assert.equal(fora.ligado(), false);
  const B = bancoFalso(); let t0 = 1000;
  const tr = O.transporteFirebase({ url: 'https://x.firebaseio.com', fetch: B.fetch, EventSource: B.EventSourceFalso });
  const sala = O.createSala({ transporte: tr, agora: () => t0++, aleatorio: () => 0.42 });
  const codigo = await sala.criar({ nome: 'Ana', deck: [{ name: 'Island', qty: 1 }], formato: 'pauper' });
  await sala.entrar(codigo, { nome: 'Bia', deck: [{ name: 'Island', qty: 1 }], formato: 'pauper' });
  await sala.publicarSetup(codigo, { seed: 1 });
  await sala.enviarAcao(codigo, { antes: 0, p: 0, action: { t: 'keep', p: 0 }, de: 0 });
  const vistos = []; sala.ouvir(codigo, d => vistos.push(d)); await tique(); await tique();
  assert.equal(vistos.at(-1).sala.estado, 'jogando'); assert.equal(vistos.at(-1).acoes.length, 1);
  await sala.apagar(codigo); assert.equal(await sala.ler(codigo), null);
});

test('Leva 134 · aplica(): put e patch em caminhos aninhados, remoção com null, nó raiz', () => {
  const tr = O.transporteFirebase({ url: 'https://x.firebaseio.com', fetch: async () => ({ ok: true, status: 200, text: async () => '' }), EventSource: class { addEventListener() {} close() {} } });
  const a = tr._aplica;
  assert.deepEqual(J(a(null, 'put', '/', { x: 1 })), { x: 1 });
  assert.deepEqual(J(a({ x: 1 }, 'put', '/a/b', 2)), { x: 1, a: { b: 2 } });
  assert.deepEqual(J(a({ x: 1, a: { b: 2, c: 3 } }, 'patch', '/a', { b: 9 })), { x: 1, a: { b: 9, c: 3 } });
  assert.deepEqual(J(a({ x: 1, a: { b: 2 } }, 'put', '/a/b', null)), { x: 1, a: {} });
  assert.deepEqual(J(a({ x: 1 }, 'patch', '/', { y: 2 })), { x: 1, y: 2 });
  assert.equal(a({ x: 1 }, 'put', '/', null), null);
});
