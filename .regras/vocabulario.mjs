// M-229 · medida de escalabilidade do motor: o vocabulário deve parar de crescer por carta.
// Conta efeitos, gatilhos, palavras-chave e nomes de alvo; separa os nomes que já são só atalhos para o seletor único.
//   node .regras/vocabulario.mjs          resumo
//   node .regras/vocabulario.mjs --json   números para comparar entre levas
import { S } from '../listas.mjs';
const efeitos = Object.keys(S.EFFECTS);
const nomesDeAlvo = [...new Set(Object.values(S.EFFECTS).flatMap(e => e.targets || []))];
const atalhos = nomesDeAlvo.filter(t => S.ALVO_SELETOR[t]);
const referencias = nomesDeAlvo.filter(t => !S.ALVO_SELETOR[t]);
const scripts = S.RAW_SCRIPTS.length;
const comSeletor = S.RAW_SCRIPTS.filter(sc => JSON.stringify(sc).includes('"target":{')).length;
const r = { scripts, efeitos: efeitos.length, gatilhos: S.TRIGGERS.length, palavrasChave: S.KEYWORDS.length,
  nomesDeAlvo: nomesDeAlvo.length, atalhosDeSeletor: atalhos.length, referenciasSemSeletor: referencias.length, scriptsComSeletorDireto: comSeletor };
if (process.argv.includes('--json')) console.log(JSON.stringify(r));
else {
  console.log(`scripts ${r.scripts} · efeitos ${r.efeitos} · gatilhos ${r.gatilhos} · palavras-chave ${r.palavrasChave}`);
  console.log(`nomes de alvo ${r.nomesDeAlvo}: ${r.atalhosDeSeletor} já são atalhos do seletor, ${r.referenciasSemSeletor} são referências (self, first-target, each-…)`);
  console.log(`referências: ${referencias.join(', ')}`);
}
