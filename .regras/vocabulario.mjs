// M-229 · medida de escalabilidade do motor: o vocabulário deve parar de crescer por carta.
// Conta efeitos, gatilhos, palavras-chave e nomes de alvo; separa os nomes que já são só atalhos para o seletor único.
//   node .regras/vocabulario.mjs          resumo
//   node .regras/vocabulario.mjs --json   números para comparar entre levas
import { S } from '../listas.mjs';
const efeitos = Object.keys(S.EFFECTS);
const nomesDeAlvo = [...new Set(Object.values(S.EFFECTS).flatMap(e => e.targets || []))];
const atalhos = nomesDeAlvo.filter(t => S.ALVO_SELETOR[t] || S.CADA_SELETOR[t]);
const referencias = nomesDeAlvo.filter(t => !S.ALVO_SELETOR[t] && !S.CADA_SELETOR[t]);
const efeitosAtalho = Object.keys(S.EFEITOS_ATALHO || {}).filter(e => S.EFFECTS[e]);
const scripts = S.RAW_SCRIPTS.length;
const continuosAtalho = S.RAW_SCRIPTS.filter(sc => (sc.grants && (sc.grants.power || sc.grants.toughness || sc.grants.per || (sc.grants.keywords || []).length)) || sc.grantsAll || (sc.self && sc.self.per) || (sc.aura && sc.aura.becomes)).length;
const continuosDiretos = S.RAW_SCRIPTS.filter(sc => (sc.continuo || []).length).length;
const comSeletor = S.RAW_SCRIPTS.filter(sc => JSON.stringify(sc).includes('"target":{')).length;
const r = { scripts, efeitos: efeitos.length, efeitosProprios: efeitos.length - efeitosAtalho.length, efeitosAtalho: efeitosAtalho.length, gatilhos: S.TRIGGERS.length, gatilhosAtalho: S.TRIGGERS.filter(w => (S.GATILHO_ZONA || {})[w] || (S.GATILHO_EVENTO || {})[w]).length, palavrasChave: S.KEYWORDS.length,
  nomesDeAlvo: nomesDeAlvo.length, atalhosDeSeletor: atalhos.length, referenciasSemSeletor: referencias.length, scriptsComSeletorDireto: comSeletor, continuosAtalho, continuosDiretos };
if (process.argv.includes('--json')) console.log(JSON.stringify(r));
else {
  console.log(`scripts ${r.scripts} · efeitos ${r.efeitos} (${r.efeitosProprios} próprios, ${r.efeitosAtalho} atalhos de outro verbo) · gatilhos ${r.gatilhos} (${r.gatilhos - r.gatilhosAtalho} próprios, ${r.gatilhosAtalho} atalhos de descritor de evento) · palavras-chave ${r.palavrasChave}`);
  console.log(`nomes de alvo ${r.nomesDeAlvo}: ${r.atalhosDeSeletor} já são atalhos do seletor, ${r.referenciasSemSeletor} são referências (self, first-target, cada jogador…)`);
  console.log(`referências: ${referencias.join(', ')}`);
  console.log(`efeitos contínuos estáticos: ${r.continuosAtalho} scripts por atalho (bônus de Aura/Equipamento, "suas criaturas têm", bônus por contagem, Aura que redefine) · ${r.continuosDiretos} escritos como continuo`);
}
