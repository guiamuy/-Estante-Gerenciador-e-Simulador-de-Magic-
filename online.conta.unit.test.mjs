// Leva P-8 · T6c-2b · sala pela internet presa à conta da Estante: assento com uid e fluxo de eventos com token.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { online: O } = loadModules();
const tique = () => new Promise(r => setTimeout(r, 0));

test('P-8 · com conta, cada assento leva o uid de quem sentou; sem conta, a sala é como antes', async () => {
  const t = O.transporteMemoria();
  const com = O.createSala({ transporte: t, quem: () => 'uidAna' }), beto = O.createSala({ transporte: t, quem: () => 'uidBeto' });
  const codigo = await com.criar({ nome: 'Ana', deck: [{ name: 'Island', qty: 60 }], formato: 'livre' });
  await beto.entrar(codigo, { nome: 'Beto', deck: [{ name: 'Island', qty: 60 }], formato: 'livre' });
  const sala = await t.ler('salas/' + codigo);
  assert.equal(sala.anfitriao.uid, 'uidAna'); assert.equal(sala.convidado.uid, 'uidBeto');
  const t2 = O.transporteMemoria(); const sem = O.createSala({ transporte: t2, quem: () => null });
  const c2 = await sem.criar({ nome: 'X', deck: [], formato: 'livre' });
  assert.equal('uid' in ((await t2.ler('salas/' + c2)).anfitriao), false);
  const quebrado = O.createSala({ transporte: O.transporteMemoria(), quem: () => { throw new Error('x'); } });
  assert.ok(await quebrado.criar({ nome: 'X', deck: [], formato: 'livre' }), 'quem() que falha não impede a sala local');
});

test('P-8 · fluxo de eventos leva o token da conta e reabre com um novo quando o Firebase diz que venceu', async () => {
  const fontes = []; let n = 0;
  class Fonte { constructor(url) { this.url = url; this.ouv = {}; fontes.push(this); } addEventListener(t, f) { (this.ouv[t] = this.ouv[t] || []).push(f); } dispara(t, d) { for (const f of this.ouv[t] || []) f(d === undefined ? {} : { data: JSON.stringify(d) }); } close() { this.fechada = true; } }
  const tr = O.transporteFirebase({ url: 'https://x.firebaseio.com/', EventSource: Fonte, fetch: async () => ({ ok: true, status: 200, text: async () => '' }), token: async () => 'tk' + (++n) });
  const vistos = []; const parar = tr.ouvir('salas/ESTA-ABCD', v => vistos.push(v));
  await tique(); await tique();
  assert.equal(fontes.length, 1); assert.equal(fontes[0].url, 'https://x.firebaseio.com/salas/ESTA-ABCD.json?auth=tk1');
  fontes[0].dispara('put', { path: '/', data: { estado: 'esperando' } });
  assert.deepEqual(JSON.parse(JSON.stringify(vistos.at(-1))), { estado: 'esperando' });
  fontes[0].dispara('auth_revoked'); await tique(); await tique();
  assert.equal(fontes[0].fechada, true); assert.equal(fontes.length, 2);
  assert.equal(fontes[1].url, 'https://x.firebaseio.com/salas/ESTA-ABCD.json?auth=tk2', 'reabre com token novo');
  parar(); assert.equal(fontes[1].fechada, true);
  fontes[1].dispara('auth_revoked'); await tique(); await tique();
  assert.equal(fontes.length, 2, 'parado não reabre');
});

test('P-8 · sem conta (token nulo) o fluxo abre sem token, como a sala de antes', async () => {
  const fontes = [];
  class Fonte { constructor(url) { this.url = url; fontes.push(this); } addEventListener() {} close() {} }
  const tr = O.transporteFirebase({ url: 'https://x.firebaseio.com', EventSource: Fonte, token: () => null });
  tr.ouvir('salas/ESTA-ABCD', () => {}); await tique(); await tique();
  assert.equal(fontes[0].url, 'https://x.firebaseio.com/salas/ESTA-ABCD.json');
});
