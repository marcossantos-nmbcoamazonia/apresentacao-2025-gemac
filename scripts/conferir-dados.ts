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
