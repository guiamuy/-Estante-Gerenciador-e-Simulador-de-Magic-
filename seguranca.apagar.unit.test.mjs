// P-10 · SEG6 · "Apagar tudo deste aparelho": apaga o armazenamento do app (pelo store vigiado, sem deixar o carimbo de
// preferência para trás), os caches do app (estante-*) e o que é do app na sessão e no armazenamento local; confere depois
// e devolve o que sobrou. O que é de outro site ou de outro app no mesmo navegador não é tocado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { saida: S, platform: P, perfil: PF } = loadModules();

function cachesFalsos(nomes) {
  const s = new Set(nomes);
  return { s, keys: async () => [...s], delete: async n => s.delete(n) };
}
function storageFalso(obj) {
  const m = new Map(Object.entries(obj));
  return { m, get length() { return m.size; }, key: i => [...m.keys()][i] ?? null, getItem: k => (m.has(k) ? m.get(k) : null), removeItem: k => { m.delete(k); }, setItem: (k, v) => m.set(k, String(v)) };
}

test('P-10 · apaga tudo do app e confere: armazenamento (sem carimbo que sobre), caches estante-*, sessão e local do app; o resto fica', async () => {
  const store = PF.vigiaStore(P.memoryStore());
  await store.set('deck.__ids', ['a']); await store.set('deck.a', { id: 'a', name: 'Lista', entries: [] });
  await store.set('collection.items', [{ name: 'Island', qty: 4 }]);
  await store.set('ui.theme', 'light');                                  // preferência: o vigiado carimba ao apagar
  await store.set('perfil', { nome: 'Gui' });
  const caches = cachesFalsos(['estante-shell-v1', 'estante-img-v1', 'estante-ocr-v1', 'estante-api-v1', 'outro-app-v1']);
  const sessao = storageFalso({ 'estante.abertura': '1', 'estante.online.assento': '{}', 'de-outro': 'x' });
  const local = storageFalso({ 'estante.online:salas/ESTA-ABCD': '{}', 'outro': 'y' });
  const r = await S.apagaTudoDoAparelho({ store, caches, sessao, local });
  assert.deepEqual(JSON.parse(JSON.stringify(r.sobrou)), [], 'nada sobrou');
  assert.equal(JSON.stringify(await store.keys('')), '[]', 'nenhuma chave, nem o carimbo das preferências');
  assert.deepEqual([...caches.s], ['outro-app-v1'], 'só os caches do app');
  assert.deepEqual([...sessao.m.keys()], ['de-outro']);
  assert.deepEqual([...local.m.keys()], ['outro']);
  assert.ok(r.chaves >= 5 && r.caches === 4 && r.sessao === 2 && r.local === 1, JSON.stringify(r));
});

test('P-10 · o que não saiu aparece em "sobrou" (o app avisa e não recarrega); sem caches nem storage, apaga o armazenamento', async () => {
  const base = P.memoryStore(); await base.set('deck.a', { id: 'a' });
  const teimoso = { ...base, keys: base.keys, get: base.get, set: base.set, async remove() { return true; } };
  const r = await S.apagaTudoDoAparelho({ store: teimoso });
  assert.equal(JSON.stringify(r.sobrou), JSON.stringify(['armazenamento: deck.a']));
  const limpo = P.memoryStore(); await limpo.set('deck.a', 1);
  const r2 = await S.apagaTudoDoAparelho({ store: limpo, caches: null, sessao: null, local: null });
  assert.equal(r2.sobrou.length, 0);
});
