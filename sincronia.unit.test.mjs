// Leva A-263 · T6d · quando o encontro do perfil roda: agendado depois das mudanças, um por vez, com estados para a
// tela; dois aparelhos convergem pelo banco (transporte de memória, mesmo contrato do Firebase por REST).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { perfil: PF, platform: P, remoto: R, online: O } = loadModules();

/** Relógio de mentira para o agendamento: `passa()` dispara o que estava marcado. */
function relogioFalso() { let n = 0; const fila = new Map(); return { set: (f) => { const id = ++n; fila.set(id, f); return id; }, clear: id => fila.delete(id), pendentes: () => fila.size, passa: () => { const fs = [...fila.values()]; fila.clear(); fs.forEach(f => f()); } }; }
const tique = () => new Promise(r => setTimeout(r, 0));
/** Um aparelho: store vigiado avisando a sincronia, perfil por cima. */
function aparelho({ banco, uid = 'uidAna', conectado = () => true, temRede = () => true, relogio = relogioFalso(), t = { v: 1000 } }) {
  let sinc = null;
  const store = PF.vigiaStore(P.memoryStore(), { agora: () => ++t.v, aoMudarPreferencia: () => sinc && sinc.mudou() });
  const perfil = PF.createPerfil({ store, agora: () => ++t.v });
  const descidas = [];
  sinc = R.createSincronia({ remotoDe: () => (conectado() ? R.createPerfilRemoto({ transporte: banco, uid }) : null), perfil, relogio, temRede, agora: () => t.v, aoDescer: async r => { descidas.push(r); } });
  return { store, perfil, sinc, relogio, descidas };
}

test('A-263 · mudança de preferência agenda o encontro; várias seguidas viram um só; o outro aparelho recebe e reaplica', async () => {
  const banco = O.transporteMemoria();
  const A = aparelho({ banco }), B = aparelho({ banco });
  assert.equal(A.sinc.estado().estado, 'desligada');
  await A.store.set('ui.theme', 'light'); await A.store.set('mesa.som', false); await A.store.set('lista.visao', 'galeria');
  assert.equal(A.sinc.estado().estado, 'pendente'); assert.equal(A.relogio.pendentes(), 1, 'três mudanças, um encontro marcado');
  A.relogio.passa(); await A.sinc.agora();
  assert.equal(A.sinc.estado().estado, 'sincronizado'); assert.equal(A.sinc.estado().subiu, 3);
  const doc = await banco.ler('perfis/uidAna/doc'); assert.equal(doc.p['ui:theme'].v, '"light"');
  await B.sinc.agora();
  assert.equal(await B.store.get('ui.theme'), 'light'); assert.equal(await B.store.get('mesa.som'), false);
  assert.equal(B.descidas.length, 1, 'o que desceu foi reaplicado uma vez');
  assert.equal(B.sinc.estado().desceu, 3);
});

test('A-263 · um encontro por vez: pedido no meio vira mais um depois; mudança durante o encontro não se perde', async () => {
  const banco = O.transporteMemoria(); let solta; let segura = true;
  const lento = { ...banco, ler: async c => { if (segura) { segura = false; await new Promise(r => { solta = r; }); } return banco.ler(c); } };
  const A = aparelho({ banco: lento });
  const p1 = A.sinc.agora(); await tique();
  assert.equal(A.sinc.estado().estado, 'sincronizando');
  const p2 = A.sinc.agora(); assert.equal(p2, p1, 'o segundo pedido espera o primeiro');
  await A.store.set('ui.theme', 'light');
  solta(); await p1;
  assert.equal(A.relogio.pendentes(), 1, 'a mudança feita durante o encontro agenda outro');
  A.relogio.passa(); await A.sinc.agora();
  assert.equal((await banco.ler('perfis/uidAna/doc')).p['ui:theme'].v, '"light"');
});

test('A-263 · sem conta: desligada e nada agendado; sem rede: espera a rede; banco recusa: recusada; falha qualquer: erro', async () => {
  const banco = O.transporteMemoria();
  const sem = aparelho({ banco, conectado: () => false });
  await sem.store.set('ui.theme', 'light'); assert.equal(sem.relogio.pendentes(), 0); assert.equal((await sem.sinc.agora()).estado, 'desligada');
  let rede = false; const off = aparelho({ banco, temRede: () => rede });
  assert.equal((await off.sinc.agora()).estado, 'sem-rede'); rede = true; assert.equal((await off.sinc.agora()).estado, 'sincronizado');
  const recusa = { ...banco, ler: async () => { throw Object.assign(new Error('api'), { status: 401 }); } };
  assert.equal((await aparelho({ banco: recusa }).sinc.agora()).estado, 'recusada');
  const caiu = { ...banco, ler: async () => { throw new Error('sem-rede'); } };
  assert.equal((await aparelho({ banco: caiu }).sinc.agora()).estado, 'sem-rede');
  const quebrado = { ...banco, ler: async () => { throw Object.assign(new Error('api'), { status: 500 }); } };
  assert.equal((await aparelho({ banco: quebrado }).sinc.agora()).estado, 'erro');
});

test('A-263 · parar (sair da conta) desmarca o agendado; a tela é avisada a cada mudança de estado', async () => {
  const banco = O.transporteMemoria(); const A = aparelho({ banco }); const vistos = [];
  const off = A.sinc.aoMudar(e => vistos.push(e.estado));
  await A.store.set('ui.theme', 'light'); assert.equal(A.relogio.pendentes(), 1);
  A.sinc.para(); assert.equal(A.relogio.pendentes(), 0); assert.equal(A.sinc.estado().estado, 'desligada');
  await A.sinc.agora(); off(); await A.store.set('ui.theme', 'dark');
  assert.deepEqual(vistos, ['pendente', 'desligada', 'sincronizando', 'sincronizado']);
});

test('A-263 · reaplicar o que desceu só quando algo desceu (encontro sem novidade não mexe no aparelho)', async () => {
  const banco = O.transporteMemoria(); const A = aparelho({ banco });
  await A.sinc.agora(); await A.sinc.agora();
  assert.equal(A.descidas.length, 0);
});
