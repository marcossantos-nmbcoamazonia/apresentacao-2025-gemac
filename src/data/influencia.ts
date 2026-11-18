/**
 * Marketing de influência: o consolidado "Big Numbers" da estratégia Always On.
 *
 * A fonte é outra planilha, e a aba `base` não é registro bruto: é o próprio
 * quadro-resumo, com blocos empilhados (cards, tabela métrica × mês e, conforme
 * o ano, dois top 5 ou a lista de campanhas do mês). O parser acha cada bloco
 * pelo RÓTULO, nunca pela posição, então uma linha nova inserida na planilha não
 * desloca nada.
 *
 * DUAS REGRAS
 *
 * 1. **O total vem da coluna TOTAL, nunca da soma dos meses.** Influenciadores
 *    são contagem de únicos (18 + 12 + 17 nos meses ≠ 32 no período) e o
 *    engajamento é taxa. Somar mês a mês erraria os dois.
 * 2. **O período é deduzido do cabeçalho** ("OUT · NOV · DEZ"), como o mês
 *    fechado do resto do deck. Ninguém digita "Outubro a Dezembro" no código.
 *
 * FORMATO 2025 × 2026
 *
 * O consolidado de 2026 traz o ano no cabeçalho ("ago./26") e dois rankings
 * (top 5 campanhas e influenciadores, por views). O de 2025 traz só o mês
 * ("OUT") e, no lugar dos rankings, "CAMPANHAS DO MÊS (Nº DE CONTEÚDOS)" em
 * texto livre: "CENTRO CULTURAL (116), CÍRIO DE NAZARÉ (35), ...". Este parser
 * lê os dois; o slide desenha o bloco que houver.
 *
 * Função pura, sem React — `scripts/conferir-dados.ts` imprime o mesmo quadro.
 */
import { MESES, type Mes } from '../api/parseSheet'
import { chaveLista, normalizarItem } from '../lib/listas'
import { parseBR } from '../lib/numbers'

export const PLANILHA_INFLUENCIA =
  import.meta.env?.VITE_SHEET_ID_INFLUENCIA ?? '16qaRdOTCzT6Rt-8-tyW-gFQAZCRnVzueHFRi4ZLWVrw'
export const ABA_INFLUENCIA = 'base'

/**
 * Ano usado quando o cabeçalho dos meses não traz o ano ("OUT", não "out./25").
 * O título "Outubro a Dezembro de 2025" da planilha não vem pela API (fica fora
 * das células), então o ano sai daqui: este deck é o fechamento de 2025, o
 * mesmo ano da aba "01 PUBLICIDADE - 2025".
 */
const ANO_PADRAO = 2025

/** Uma métrica da tabela: o valor de cada mês e o da coluna TOTAL. */
export interface MetricaInfluencia {
  meses: (number | null)[]
  total: number | null
}

export interface ItemRanking {
  nome: string
  conteudos: number | null
  views: number | null
  alcance: number | null
  interacoes: number | null
  /** participação no período, em % (20,8) — de views no top 5, de conteúdos nas campanhas */
  participacao: number | null
}

/** Uma campanha num mês, de "CENTRO CULTURAL (116)". */
export interface CampanhaMes {
  nome: string
  conteudos: number
}

export interface DadosInfluencia {
  meses: { nome: Mes; ano: number }[]
  /** "Out – Dez 2025" */
  periodo: string
  /** "Dez/2025" — para a pílula de status */
  curto: string
  conteudos: MetricaInfluencia
  stories: MetricaInfluencia
  reels: MetricaInfluencia
  outros: MetricaInfluencia
  views: MetricaInfluencia
  alcance: MetricaInfluencia
  curtidas: MetricaInfluencia
  comentarios: MetricaInfluencia
  compartilhados: MetricaInfluencia
  salvos: MetricaInfluencia
  interacoes: MetricaInfluencia
  respostasStories: MetricaInfluencia
  influenciadores: MetricaInfluencia
  campanhas: MetricaInfluencia
  /** em %, só Reels: interações orgânicas ÷ alcance orgânico */
  engajamento: MetricaInfluencia
  /** formato 2026 */
  topCampanhas: ItemRanking[]
  topInfluenciadores: ItemRanking[]
  /** formato 2025: campanhas de cada mês, na ordem de `meses` */
  campanhasPorMes: CampanhaMes[][]
  /** formato 2025: soma de conteúdos por campanha no período, maior primeiro */
  campanhasNoPeriodo: ItemRanking[]
  observacoes: string[]
}

/** minúsculas, sem acento e sem pontuação: "% das Views" -> "dasviews" */
function norm(s: string | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

const cel = (linha: string[] | undefined, i: number) => (linha?.[i] ?? '').trim()

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** "ago./26" -> { Ago, 2026 } · "OUT" -> { Out, ANO_PADRAO } · "Outubro" -> { Out, ANO_PADRAO } */
function mesDoCabecalho(bruto: string): { nome: Mes; ano: number } | null {
  const m = semAcento(bruto).match(/^([a-z]{3})[a-z]*\.?\s*(?:\/\s*(\d{2}|\d{4}))?$/)
  if (!m) return null
  const nome = MESES.find((x) => x.toLowerCase() === m[1])
  if (!nome) return null
  if (!m[2]) return { nome, ano: ANO_PADRAO }
  const ano = Number(m[2])
  return { nome, ano: ano < 100 ? 2000 + ano : ano }
}

function lerRanking(values: string[][], titulo: string): ItemRanking[] {
  const iTitulo = values.findIndex((l) => norm(l?.[0]).startsWith(titulo))
  if (iTitulo < 0) return []
  const cab = (values[iTitulo + 1] ?? []).map(norm)
  const col = (teste: (h: string) => boolean) => cab.findIndex(teste)
  const c = {
    conteudos: col((h) => h === 'conteudos'),
    views: col((h) => h.startsWith('views')),
    alcance: col((h) => h.startsWith('alcance')),
    interacoes: col((h) => h.startsWith('interacoes')),
    participacao: col((h) => h.includes('dasviews')),
  }
  const num = (l: string[], i: number) => (i >= 0 ? parseBR(cel(l, i)) : null)

  const itens: ItemRanking[] = []
  for (let i = iTitulo + 2; i < values.length; i++) {
    const l = values[i]
    const nome = cel(l, 0)
    if (!nome) break
    itens.push({
      nome,
      conteudos: num(l, c.conteudos),
      views: num(l, c.views),
      alcance: num(l, c.alcance),
      interacoes: num(l, c.interacoes),
      participacao: num(l, c.participacao),
    })
  }
  return itens
}

/** "CENTRO CULTURAL (116), CÍRIO DE NAZARÉ (35)" -> [{ Centro Cultural, 116 }, ...] */
function campanhasDaCelula(texto: string): CampanhaMes[] {
  const itens: CampanhaMes[] = []
  for (const m of texto.matchAll(/([^,()]+?)\s*\((\d[\d.]*)\)/g)) {
    const conteudos = parseBR(m[2])
    if (conteudos == null) continue
    itens.push({ nome: normalizarItem(m[1]), conteudos })
  }
  return itens
}

/**
 * Bloco "CAMPANHAS DO MÊS": uma linha por mês, com o nome do mês na coluna A e
 * a lista na B. Casa cada linha com o mês do cabeçalho pelo nome, não pela ordem.
 */
function lerCampanhasDoMes(
  values: string[][],
  meses: { nome: Mes; ano: number }[],
): CampanhaMes[][] {
  const iTitulo = values.findIndex((l) => norm(l?.[0]).startsWith('campanhasdomes'))
  const porMes: CampanhaMes[][] = meses.map(() => [])
  if (iTitulo < 0) return porMes

  for (let i = iTitulo + 1; i < values.length; i++) {
    const l = values[i]
    const rotulo = cel(l, 0)
    if (!rotulo) break
    const mes = mesDoCabecalho(rotulo)
    const k = mes ? meses.findIndex((m) => m.nome === mes.nome) : -1
    if (k < 0) continue
    porMes[k] = campanhasDaCelula(l.slice(1).join(', '))
  }
  return porMes
}

/** Soma de conteúdos por campanha no período, com a participação de cada uma. */
function somarCampanhas(porMes: CampanhaMes[][]): ItemRanking[] {
  const soma = new Map<string, { nome: string; conteudos: number }>()
  for (const mes of porMes) {
    for (const c of mes) {
      const k = chaveLista(c.nome)
      const atual = soma.get(k)
      if (atual) atual.conteudos += c.conteudos
      else soma.set(k, { ...c })
    }
  }
  const total = [...soma.values()].reduce((s, c) => s + c.conteudos, 0)
  return [...soma.values()]
    .sort((a, b) => b.conteudos - a.conteudos || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((c) => ({
      nome: c.nome,
      conteudos: c.conteudos,
      views: null,
      alcance: null,
      interacoes: null,
      participacao: total > 0 ? (c.conteudos / total) * 100 : null,
    }))
}

export function parseInfluencia(values: string[][]): DadosInfluencia {
  const iCab = values.findIndex((l) => norm(l?.[0]) === 'metrica')
  if (iCab < 0) throw new Error('Consolidado de influência: linha "MÉTRICA" não encontrada')

  const cab = values[iCab]
  const colMeses: { i: number; nome: Mes; ano: number }[] = []
  cab.forEach((h, i) => {
    const m = mesDoCabecalho((h ?? '').trim())
    if (m) colMeses.push({ i, ...m })
  })
  const iTotal = cab.findIndex((h) => norm(h) === 'total')
  if (!colMeses.length || iTotal < 0) {
    throw new Error('Consolidado de influência: cabeçalho sem meses ou sem TOTAL')
  }

  // a tabela vai do cabeçalho até o primeiro bloco que não é métrica
  let iFim = values.findIndex(
    (l, i) =>
      i > iCab && (norm(l?.[0]).startsWith('top5') || norm(l?.[0]).startsWith('campanhasdomes')),
  )
  if (iFim < 0) iFim = values.length
  const tabela = values.slice(iCab + 1, iFim)

  const metrica = (teste: (rotulo: string) => boolean): MetricaInfluencia => {
    const l = tabela.find((x) => teste(norm(x?.[0])))
    return {
      meses: colMeses.map((c) => (l ? parseBR(cel(l, c.i)) : null)),
      total: l ? parseBR(cel(l, iTotal)) : null,
    }
  }

  const primeiro = colMeses[0]
  const ultimo = colMeses[colMeses.length - 1]
  const periodo =
    colMeses.length === 1
      ? `${primeiro.nome} ${primeiro.ano}`
      : primeiro.ano === ultimo.ano
        ? `${primeiro.nome} – ${ultimo.nome} ${ultimo.ano}`
        : `${primeiro.nome}/${primeiro.ano} – ${ultimo.nome}/${ultimo.ano}`

  const iObs = values.findIndex((l) => norm(l?.[0]).startsWith('observac'))
  const observacoes =
    iObs < 0
      ? []
      : values
          .slice(iObs + 1)
          .map((l) => cel(l, 0))
          .filter(Boolean)

  const meses = colMeses.map(({ nome, ano }) => ({ nome, ano }))
  const campanhasPorMes = lerCampanhasDoMes(values, meses)

  return {
    meses,
    periodo,
    curto: `${ultimo.nome}/${ultimo.ano}`,
    // "Total" exato: "Total de Interações" é outra linha
    conteudos: metrica((r) => r === 'total'),
    stories: metrica((r) => r === 'stories'),
    reels: metrica((r) => r === 'reels'),
    outros: metrica((r) => r.startsWith('outros')),
    views: metrica((r) => r.startsWith('viewstotais')),
    alcance: metrica((r) => r.startsWith('alcanceorganico')),
    curtidas: metrica((r) => r === 'curtidas'),
    comentarios: metrica((r) => r === 'comentarios'),
    compartilhados: metrica((r) => r.startsWith('compartilhad')),
    salvos: metrica((r) => r === 'salvos'),
    interacoes: metrica((r) => r.startsWith('totaldeinteracoes')),
    respostasStories: metrica((r) => r.startsWith('respostasastories')),
    influenciadores: metrica((r) => r.startsWith('influenciadores')),
    campanhas: metrica((r) => r.startsWith('campanhas')),
    engajamento: metrica((r) => r.startsWith('engajamento')),
    topCampanhas: lerRanking(values, 'top5campanhas'),
    topInfluenciadores: lerRanking(values, 'top5influenciadores'),
    campanhasPorMes,
    campanhasNoPeriodo: somarCampanhas(campanhasPorMes),
    observacoes,
  }
}
