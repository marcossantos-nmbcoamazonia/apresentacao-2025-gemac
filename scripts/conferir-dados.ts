/**
 * Confere, pelo terminal, o que os slides vão mostrar — sem abrir o browser.
 *
 *     npm run conferir
 *
 * Usa exatamente as mesmas funções da aplicação (src/data/*.ts), então qualquer
 * mudança na planilha que quebre o parse, desloque o mês de fechamento ou mova
 * uma métrica derivada aparece aqui. Cada acumulado somado mês a mês é
 * comparado com a coluna "Acum. AAAA" da planilha — divergência ali quase
 * sempre é a fórmula da planilha deixando um mês de fora.
 */
import { parseAba, porId } from '../src/api/parseSheet'
import { parseBR } from '../src/lib/numbers'
import { montarDistribuicao, TOTAL_TABELA } from '../src/data/distribuicaoMidia'
import {
  ABA_INFLUENCIA,
  PLANILHA_INFLUENCIA,
  parseInfluencia,
  type MetricaInfluencia,
} from '../src/data/influencia'
import { ABA_PUBLICIDADE, montarPublicidade } from '../src/data/publicidade'
import type { Kpi } from '../src/data/kpis'
import type { SerieMensal } from '../src/data/publicidadeAnalise'

const BASE = process.env.VITE_API_BASE ?? 'https://nmbcoamazonia-api.vercel.app'
const SHEET = process.env.VITE_SHEET_ID ?? '12vC5uRnSYAzqlBVKBO8AsQCNuvoVNZkRV8e-1kSAZPg'

const REGUA = '─'.repeat(92)
const br = (n: number, casas = 0) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
    .format(n)

let divergencias = 0

const r = await fetch(
  `${BASE}/google/sheets/${SHEET}/data?range=${encodeURIComponent(ABA_PUBLICIDADE)}`,
)
if (!r.ok) throw new Error(`API respondeu ${r.status} para "${ABA_PUBLICIDADE}"`)
const json = (await r.json()) as { success: boolean; data?: { values?: string[][] } }
if (!json.success || !json.data?.values) throw new Error('Resposta sem dados')

const aba = parseAba(json.data.values)
const pub = montarPublicidade(aba)
if (!pub) throw new Error(`Nenhum mês com dado em ${ABA_PUBLICIDADE}`)
const a = pub.analise

console.log(`\n${aba.titulo}`)
console.log(`MÊS FECHADO ...... ${pub.fechado.curto}   (período: ${pub.fechado.periodo})`)

// ------------------------------- acumulados ---------------------------------
console.log(`\nACUMULADO DO PERÍODO   (soma mês a mês × coluna "Acum. ${aba.ano}" da planilha)`)
console.log(REGUA)
for (const k of [...pub.kpis, ...pub.investimento] as Kpi[]) {
  const acumPlanilha = parseBR(porId(aba.linhas, k.id)?.acumAno)
  let bate = ''
  if (k.valor == null) bate = 'sem dado na planilha'
  else if (acumPlanilha != null) {
    const diff = k.valor - acumPlanilha
    if (Math.abs(diff) < 0.01) bate = 'igual à planilha'
    else {
      divergencias++
      bate = `DIFERE da planilha (${br(acumPlanilha, 2)}; diferença ${br(diff, 2)})`
    }
  }
  console.log(
    `  ${k.id.padEnd(8)}${k.rotulo.padEnd(34)}${k.formatado.padStart(12)}` +
      `${k.valorCheio.padStart(20)}   ${bate}`,
  )
}

// --------------------------------- séries -----------------------------------
function linhaSerie(s: SerieMensal) {
  const pontos = s.pontos
    .map((p) => (p.valor == null ? `${p.mes} —` : `${p.mes} ${br(p.valor)}`))
    .join(' · ')
  console.log(`\n  ${s.rotulo}  (total ${br(s.total)})`)
  console.log(`    ${pontos}`)
  if (s.pico) console.log(`    pico: ${s.pico.mes} com ${br(s.pico.valor!)}`)
  if (s.lacunas.length) console.log(`    SEM DADO em: ${s.lacunas.join(', ')}`)
}

console.log(`\n\nSÉRIE MENSAL`)
console.log(REGUA)
for (const s of Object.values(a.series)) linhaSerie(s)

// ------------------------------- derivadas ----------------------------------
console.log(`\n\nMÉTRICAS DERIVADAS`)
console.log(REGUA)
for (const d of [a.ctr, a.cpl, a.cpm]) {
  console.log(`  ${d.rotulo.padEnd(16)}${d.formatado.padStart(14)}    ${d.conta}`)
}

console.log(`\n  Alcance total ....... ${br(a.alcanceTotal).padStart(16)}`)
for (const p of a.alcancePartes) {
  console.log(
    `      ${p.rotulo.padEnd(22)}${br(p.valor).padStart(16)}  ${(p.participacao * 100).toFixed(1)}%`,
  )
}

console.log(`\n  Investimento total .. ${('R$ ' + br(a.investimentoTotal)).padStart(16)}`)
for (const p of a.investimentoPartes) {
  console.log(
    `      ${p.rotulo.padEnd(22)}${('R$ ' + br(p.valor)).padStart(16)}  ${(p.participacao * 100).toFixed(1)}%`,
  )
}

console.log(`\n  CTR mês a mês:`)
console.log(
  '      ' +
    a.ctrMensal
      .map((p) => `${p.mes} ${p.valor == null ? '—' : p.valor.toFixed(2) + '%'}`)
      .join(' · '),
)

// -------------------------------- produtos ----------------------------------
console.log(`\n\nPRODUTOS (recorrência em ${pub.fechado.indice + 1} meses)`)
console.log(REGUA)
for (const faixa of ['constante', 'recorrente', 'pontual'] as const) {
  const doFaixa = a.produtos.filter((p) => p.faixa === faixa)
  if (!doFaixa.length) continue
  console.log(`  ${faixa.toUpperCase()} (${doFaixa.length})`)
  for (const p of doFaixa) {
    console.log(`      ${String(p.meses).padStart(2)}/${pub.fechado.indice + 1}  ${p.nome}`)
  }
}

console.log(`\nPRAÇAS: ${pub.pracas}`)
console.log(`UFs derivadas (${a.ufs.length}): ${a.ufs.join(' · ')}`)

// -------------------------------- ressalvas ---------------------------------
console.log(`\n\nRESSALVAS A EXIBIR NO SLIDE`)
console.log(REGUA)
const ressalvas: string[] = []
for (const s of Object.values(a.series)) {
  if (s.lacunas.length) ressalvas.push(`${s.rotulo}: sem dado em ${s.lacunas.join(', ')}`)
}
// valor isolado ordens de grandeza abaixo dos vizinhos = provável erro de digitação
for (const s of Object.values(a.series)) {
  const v = s.pontos.filter((p) => p.valor != null).map((p) => p.valor!)
  if (v.length < 3) continue
  const mediana = [...v].sort((x, y) => x - y)[Math.floor(v.length / 2)]
  for (const p of s.pontos) {
    if (p.valor != null && p.valor > 0 && mediana / p.valor > 100) {
      ressalvas.push(`${s.rotulo}: ${p.mes} = ${br(p.valor)}, ${Math.round(mediana / p.valor)}x abaixo da mediana`)
    }
  }
}
for (const x of ressalvas) console.log(`  · ${x}`)

console.log(
  divergencias === 0
    ? `\nTodos os acumulados batem com a coluna "Acum. ${aba.ano}" da planilha.\n`
    : `\n${divergencias} acumulado(s) divergem da coluna "Acum. ${aba.ano}". O slide usa a soma\n` +
        `mês a mês; confira a fórmula da planilha (costuma ser um mês fora do intervalo).\n`,
)

// ------------------------- base do CPL (lista chumbada) ---------------------
console.log(`\nBASE DO CPL — campanhas com meta de lead`)
console.log(REGUA)
if (a.campanhasLead.length === 0) {
  console.log(
    a.series.leads.temDado
      ? '  ATENÇÃO: há leads na planilha mas nenhuma campanha em src/data/campanhasLead.ts — CPL oculto.'
      : '  Sem leads na planilha e sem campanhas de lead: o slide não mostra CPL.',
  )
}
for (const c of a.campanhasLead) {
  console.log(`  PI ${c.pi.padEnd(9)}${('R$ ' + br(c.investimento, 2)).padStart(18)}  ${c.nome} (${c.agencia})`)
}
if (a.campanhasLead.length > 0) {
  console.log(`  ${''.padEnd(9)}${('R$ ' + br(a.investimentoLead, 2)).padStart(18)}  TOTAL`)
}
if (a.leadDesatualizado) {
  console.log(
    `\n  ATENÇÃO: lista conferida até ${a.leadConferidoAte}, planilha fechou ${pub.fechado.curto}.\n` +
      `  Os leads do mês novo entram no CPL mas o investimento dele não — o CPL está otimista.\n` +
      `  Confira os PIs do período e atualize src/data/campanhasLead.ts (inclusive CONFERIDO_ATE).`,
  )
}

// --------------------------- distribuição de mídia --------------------------
const imp = a.series.impressoes.temDado ? a.series.impressoes.total : null
const tabela = montarDistribuicao(imp) // sem ajuste: os valores como vieram
const dist = montarDistribuicao(imp, a.series.midia.temDado ? a.series.midia.total : null)
console.log(`\n\nDISTRIBUIÇÃO DE MÍDIA POR MEIO   (valores transcritos em src/data/distribuicaoMidia.ts)`)
console.log(REGUA)
for (const m of dist.meios) {
  console.log(
    `  ${m.meio.padEnd(16)}${('R$ ' + br(m.investimento, 2)).padStart(18)}  ${br(m.participacao * 100, 1).padStart(5)}%` +
      `${(m.entrega == null ? '—' : br(m.entrega)).padStart(16)} ${m.unidade}` +
      `${m.daPlanilha ? '  (PUB-02)' : ''}${m.ajuste ? `  (inclui ajuste de R$ ${br(m.ajuste, 2)})` : ''}`,
  )
}
console.log(`  ${'TOTAL'.padEnd(16)}${('R$ ' + br(dist.total, 2)).padStart(18)}`)
console.log(
  Math.abs(tabela.total - TOTAL_TABELA) < 0.01
    ? `  Soma da tabela-fonte = "Total geral" (R$ ${br(TOTAL_TABELA, 2)}).`
    : `  ATENÇÃO: soma da tabela-fonte difere do "Total geral" (R$ ${br(TOTAL_TABELA, 2)}).`,
)
console.log(
  `  Total por meio = investimento executado PUB-07 (R$ ${br(a.series.midia.total, 2)}): ` +
    `${Math.abs(dist.total - a.series.midia.total) < 0.01 ? 'bate' : 'NÃO BATE'}. ` +
    `Ajuste em Internet: R$ ${br(dist.ajuste, 2)}.`,
)

// ------------------------- marketing de influência --------------------------
const rInf = await fetch(
  `${BASE}/google/sheets/${PLANILHA_INFLUENCIA}/data?range=${encodeURIComponent(ABA_INFLUENCIA)}`,
)
if (!rInf.ok) throw new Error(`API respondeu ${rInf.status} para "${ABA_INFLUENCIA}"`)
const jInf = (await rInf.json()) as { success: boolean; data?: { values?: string[][] } }
if (!jInf.success || !jInf.data?.values) throw new Error('Consolidado de influência sem dados')
const inf = parseInfluencia(jInf.data.values)
const cabMeses = inf.meses.map((m) => m.nome).join('   ')

console.log(`

MARKETING DE INFLUÊNCIA   (planilha ${PLANILHA_INFLUENCIA.slice(0, 8)}…, aba "${ABA_INFLUENCIA}")`)
console.log(`PERÍODO ........... ${inf.periodo}   (pílula: dados até ${inf.curto})`)
console.log(REGUA)

const fmtM = (v: number | null) => (v == null ? '—' : br(v, Number.isInteger(v) ? 0 : 2))
const linhaInf = (rotulo: string, m: MetricaInfluencia) =>
  console.log(
    `  ${rotulo.padEnd(26)}${m.meses.map((v) => fmtM(v).padStart(12)).join('')}${fmtM(m.total).padStart(14)}`,
  )
console.log(`  ${''.padEnd(26)}${inf.meses.map((m) => m.nome.padStart(12)).join('')}${'TOTAL'.padStart(14)}`)
linhaInf('Conteúdos', inf.conteudos)
linhaInf('  Stories', inf.stories)
linhaInf('  Reels', inf.reels)
linhaInf('  Outros', inf.outros)
linhaInf('Views totais', inf.views)
linhaInf('Alcance orgânico', inf.alcance)
linhaInf('Interações', inf.interacoes)
linhaInf('Influenciadores', inf.influenciadores)
linhaInf('Engaj. orgânico (%)', inf.engajamento)

if (inf.campanhasNoPeriodo.length) {
  console.log(`\n  Campanhas no período (nº de conteúdos)`)
  for (const c of inf.campanhasNoPeriodo) {
    console.log(`    ${c.nome.padEnd(26)}${fmtM(c.conteudos).padStart(8)}  ${br(c.participacao ?? 0, 1).padStart(5)}%`)
  }
}

// a planilha é calculada por fórmula; se alguém sobrescrever uma célula,
// as somas internas deixam de fechar e aparece aqui
const avisos: string[] = []
const soma = (...xs: (number | null)[]) => xs.reduce<number>((acc, b) => acc + (b ?? 0), 0)
const confere = (rotulo: string, esperado: number, obtido: number | null) => {
  if (obtido == null || Math.abs(esperado - obtido) > 0.5) {
    avisos.push(`${rotulo}: esperado ${br(esperado)}, planilha traz ${fmtM(obtido)}`)
  }
}
const colunas = [...inf.meses.map((m, i) => ({ rotulo: m.nome, i })), { rotulo: 'TOTAL', i: -1 }]
const em = (m: MetricaInfluencia, i: number) => (i < 0 ? m.total : m.meses[i])
for (const { rotulo, i } of colunas) {
  confere(
    `Interações ${rotulo} = curtidas + comentários + compartilhados + salvos`,
    soma(em(inf.curtidas, i), em(inf.comentarios, i), em(inf.compartilhados, i), em(inf.salvos, i)),
    em(inf.interacoes, i),
  )
  confere(
    `Conteúdos ${rotulo} = Stories + Reels + outros`,
    soma(em(inf.stories, i), em(inf.reels, i), em(inf.outros, i)),
    em(inf.conteudos, i),
  )
}
for (const [rotulo, m] of [
  ['Conteúdos', inf.conteudos],
  ['Views', inf.views],
  ['Alcance orgânico', inf.alcance],
  ['Interações', inf.interacoes],
] as const) {
  confere(`${rotulo}: TOTAL = soma dos meses`, soma(...m.meses), m.total)
}
// 2025: a lista de campanhas do mês tem que somar o total de conteúdos do mês
inf.campanhasPorMes.forEach((lista, i) => {
  if (!lista.length) return
  confere(
    `Campanhas de ${inf.meses[i].nome} somam os conteúdos do mês`,
    soma(...lista.map((c) => c.conteudos)),
    inf.conteudos.meses[i],
  )
})
console.log(
  avisos.length
    ? `\n  ATENÇÃO — somas que não fecham:\n${avisos.map((x) => `    · ${x}`).join('\n')}`
    : `\n  Somas internas conferem (${cabMeses} e TOTAL).`,
)
console.log('')
