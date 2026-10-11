// P-14 · SEG8 · bloquear uma conta na partida online: a lista guardada (online.bloqueios) é limpa ao ler, sem repetição e
// com teto; quem você bloqueou não monta sala com você — ao entrar na sala dele a recusa vem antes de escrever qualquer
// coisa na sala; a lista vai no backup (sincronizar entre aparelhos espera as regras do banco).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { online: O, perfil: PF, remoto: R } = loadModules();
const js = v => JSON.stringify(v);

test('P-14 · a lista de bloqueados: bloquear sem repetir, desbloquear, nome limpo, uid inválido fora, teto com os mais novos', () => {
  let l = O.bloquear([], { uid: 'uA', nome: '  Ana \n Silva ', em: 1 });
  l = O.bloquear(l, { uid: 'uB', nome: '', em: 2 });
  l = O.bloquear(l, { uid: 'uA', nome: 'Ana', em: 3 });                       // de novo: vai para o fim, uma vez só
  assert.equal(js(l.map(b => [b.uid, b.nome])), js([['uB', 'Jogador'], ['uA', 'Ana']]));
  assert.ok(O.estaBloqueado(l, 'uA') && !O.estaBloqueado(l, 'uC') && !O.estaBloqueado(l, null));
  assert.equal(js(O.desbloquear(l, 'uA').map(b => b.uid)), js(['uB']));
  assert.equal(O.bloquear(l, { uid: '../perfis', nome: 'x' }).length, 2, 'uid que não é de conta não entra');
  assert.equal(O.bloqueiosDe('lixo').length, 0); assert.equal(O.bloqueiosDe([null, { uid: 7 }, { uid: 'ok', nome: 'A'.repeat(90) }])[0].nome.length, 40);
  const muitos = Array.from({ length: O.BLOQUEIOS_MAX + 5 }, (_, i) => ({ uid: 'u' + i, nome: 'n' }));
  const cortada = O.bloqueiosDe(muitos);
  assert.equal(cortada.length, O.BLOQUEIOS_MAX); assert.equal(cortada.at(-1).uid, 'u' + (O.BLOQUEIOS_MAX + 4));
});

test('P-14 · quem está do outro lado da sala: o convidado para o anfitrião e vice-versa; sem conta, uid null', () => {
  const sala = { anfitriao: { nome: 'Gui', uid: 'uG' }, convidado: { nome: 'Ana', uid: 'uA' } };
  assert.equal(js(O.outroDaSala(sala, 0)), js({ uid: 'uA', nome: 'Ana' }));
  assert.equal(js(O.outroDaSala(sala, 1)), js({ uid: 'uG', nome: 'Gui' }));
  assert.equal(O.outroDaSala({ anfitriao: { nome: 'Gui' }, convidado: { nome: 'Ana' } }, 0).uid, null);
  assert.equal(O.outroDaSala({ anfitriao: { nome: 'Gui' }, convidado: null }, 0), null);
});

test('P-14 · entrar na sala de quem você bloqueou é recusado antes de escrever na sala; sem bloqueio, entra como antes', async () => {
  const transporte = O.transporteMemoria();
  const anfitriao = O.createSala({ transporte, quem: () => 'uG' });
  const codigo = await anfitriao.criar({ nome: 'Gui', deck: [], formato: 'pauper' });
  const antes = js(await transporte.ler(`${O.RAIZ}/${codigo}`));
  const barrado = O.createSala({ transporte, quem: () => 'uA', bloqueado: async uid => uid === 'uG' });
  await assert.rejects(barrado.entrar(codigo, { nome: 'Ana', deck: [], formato: 'pauper' }), /sala-bloqueada/);
  assert.equal(js(await transporte.ler(`${O.RAIZ}/${codigo}`)), antes, 'nada foi escrito na sala');
  const quebrado = O.createSala({ transporte, quem: () => 'uA', bloqueado: async () => { throw new Error('sem store'); } });
  assert.equal(await quebrado.entrar(codigo, { nome: 'Ana', deck: [], formato: 'pauper' }), codigo, 'lista ilegível não impede de jogar');
  const sala = await transporte.ler(`${O.RAIZ}/${codigo}`);
  assert.equal(sala.convidado.uid, 'uA');
});

test('P-14 · a lista vai no backup e fica fora do perfil sincronizado (as regras do banco ainda não aceitam a chave)', () => {
  assert.equal(PF.classeDe(O.BLOQUEIOS_KEY), 'conteudo');
  assert.ok(PF.PREFERENCIAS.includes(O.BLOQUEIOS_KEY), 'backup completo leva a lista');
  assert.ok(!PF.DO_DOCUMENTO.includes(O.BLOQUEIOS_KEY), 'fora do documento: um PATCH com chave recusada levaria as outras preferências junto');
  // cheia, no tamanho máximo, a lista cabe no teto de uma preferência na nuvem (para o dia em que sincronizar)
  const cheia = O.bloqueiosDe(Array.from({ length: O.BLOQUEIOS_MAX }, (_, i) => ({ uid: 'x'.repeat(28) + i, nome: 'N'.repeat(60), em: 4e12 })));
  assert.ok(JSON.stringify(cheia).length < R.VALOR_MAX, JSON.stringify(cheia).length + ' < ' + R.VALOR_MAX);
});
