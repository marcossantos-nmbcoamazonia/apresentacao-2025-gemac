/**
 * Leitura de mídia sobre a aba "01 PUBLICIDADE".
 *
 * A planilha entrega só contagens brutas. O que transforma isso em apresentação
 * de mídia são as relações entre elas — CTR, CPL, CPM, alcance somado — e a
 * série mensal, que o deck antigo descartava ao mostrar apenas o acumulado.
 *
 * Tudo aqui é função pura, sem React: `scripts/conferir-dados.ts` roda as mesmas
 * contas pelo terminal, então qualquer divergência aparece antes da reunião.
 */
import { MESES, porId, type AbaParseada, type Mes } from '../api/parseSheet'
import { parseBR } from '../lib/numbers'
import { chaveLista, itensDaCelula } from '../lib/listas'
import {
  CAMPANHAS_LEAD,
  CONFERIDO_ATE,
  INVESTIMENTO_LEAD,
  type CampanhaLead,
} from './campanhasLead'
import type { MesFechado } from './resolveClosedMonth'

/** Um ponto da série: o mês e o valor, `null` quando a célula está vazia. */
export interface PontoMes {
  mes: Mes
  indice: number
  valor: number | null
}

export interface SerieMensal {
  id: string
  rotulo: string
  pontos: PontoMes[]
  total: number
  /** maior valor da série, para escalar o gráfico */
  maximo: number
  /** mês do pico; null se a série está vazia */
  pico: PontoMes | null
  /** meses sem valor dentro do período fechado */
  lacunas: Mes[]
  /**
   * Algum mês tem valor. Série toda vazia (em 2025: leads, fluxo aeroportuário
   * e produção) soma `total = 0`, e zero aqui seria mentira — "não enviado"
   * não é "nenhum lead". Os slides testam isto antes de usar `total`.
   */
  temDado: boolean
}

/** Série de um indicador, recortada em Jan → mês fechado. */
export function serieDoIndicador(
  aba: AbaParseada,
  id: string,
  rotulo: string,
  fechado: MesFechado,
): SerieMensal {
  const linha = porId(aba.linhas, id)
  const pontos: PontoMes[] = []

  for (let i = 0; i <= fechado.indice; i++) {
    const mes = MESES[i]
    pontos.push({ mes, indice: i, valor: linha ? parseBR(linha.meses[mes]) : null })
  }

  const comValor = pontos.filter((p) => p.valor != null) as (PontoMes & { valor: number })[]
  const total = comValor.reduce((s, p) => s + p.valor, 0)
  const maximo = comValor.reduce((m, p) => Math.max(m, p.valor), 0)
  const pico = comValor.length ? comValor.reduce((a, b) => (b.valor > a.valor ? b : a)) : null

  return {
    id,
    rotulo,
    pontos,
    total,
    maximo,
    pico,
    lacunas: pontos.filter((p) => p.valor == null).map((p) => p.mes),
    temDado: comValor.length > 0,
  }
}

/** Uma métrica derivada, com a conta que a gerou à mostra. */
export interface Derivada {
  rotulo: string
  valor: number | null
  formatado: string
  /** "867.189 cliques ÷ 317.296.690 impressões" — a auditoria em uma linha */
  conta: string
  /** leitura curta para o slide */
  leitura: string
}

/** Recorrência de um produto ao longo dos meses do período. */
export interface Produto {
  nome: string
  /** em quantos meses do período o produto aparece */
  meses: number
  faixa: 'constante' | 'recorrente' | 'pontual'
}

export interface AnalisePublicidade {
  series: {
    leads: SerieMensal
    impressoes: SerieMensal
    cliques: SerieMensal
    ooh: SerieMensal
    aeroporto: SerieMensal
    midia: SerieMensal
    producao: SerieMensal
  }
  /** impressões digitais + impactos OOH + fluxo aeroportuário */
  alcanceTotal: number
  /** as parcelas do alcance que têm dado no período, já com participação */
  alcancePartes: { rotulo: string; valor: number; participacao: number }[]
  /** mídia + produção */
  investimentoTotal: number
  /** só as parcelas com dado — produção vazia não aparece como "R$ 0 · 0%" */
  investimentoPartes: { rotulo: string; valor: number; participacao: number }[]
  /** campanhas com meta de lead e a soma delas — numerador do CPL */
  campanhasLead: CampanhaLead[]
  investimentoLead: number
  /**
   * A planilha fechou um mês além do último conferido na lista de campanhas:
   * os leads do mês novo entram no CPL, o investimento dele não. O CPL fica
   * otimista até alguém conferir os PIs do mês.
   */
  leadDesatualizado: boolean
  /** "Dez/2025" — até onde a lista de campanhas foi conferida */
  leadConferidoAte: string
  ctr: Derivada
  cpl: Derivada
  cpm: Derivada
  /** CTR mês a mês, em % — série única, para a linha do slide de eficiência */
  ctrMensal: PontoMes[]
  produtos: Produto[]
  /** UFs cobertas, derivadas de PUB-10 */
  ufs: string[]
}

const nf = (n: number, casas = 0) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
    .format(n)

/**
 * "Amazônia Legal" são nove estados por definição legal, e a aba PARAMETROS da
 * própria planilha lista exatamente esses nove mais DF e SP como vocabulário de
 * UF — por isso a expansão abaixo é leitura da planilha, não suposição.
 */
const AMAZONIA_LEGAL = ['AC', 'AM', 'AP', 'MA', 'MT', 'PA', 'RO', 'RR', 'TO']

export function ufsDasPracas(pracas: string): string[] {
  const texto = chaveLista(pracas)
  const ufs: string[] = []
  if (texto.includes('AMAZONIA LEGAL')) ufs.push(...AMAZONIA_LEGAL)
  for (const uf of ['DF', 'SP', 'RJ', 'MG', 'BA', 'PE', 'CE']) {
    if (new RegExp(`\\b${uf}\\b`).test(texto) && !ufs.includes(uf)) ufs.push(uf)
  }
  return ufs
}

function faixaDeRecorrencia(meses: number, total: number): Produto['faixa'] {
  const proporcao = meses / Math.max(total, 1)
  if (proporcao >= 0.7) return 'constante'
  if (proporcao >= 0.3) return 'recorrente'
  return 'pontual'
}

/** Conta em quantos meses do período cada produto de PUB-09 aparece. */
export function recorrenciaDeProdutos(aba: AbaParseada, fechado: MesFechado): Produto[] {
  const linha = porId(aba.linhas, 'PUB-09')
  if (!linha) return []

  const totalMeses = fechado.indice + 1
  // chave normalizada -> { nome de exibição, meses }
  const contagem = new Map<string, { nome: string; meses: number }>()

  for (let i = 0; i <= fechado.indice; i++) {
    // um produto listado duas vezes no mesmo mês conta uma só
    const noMes = new Set<string>()
    for (const item of itensDaCelula(linha.meses[MESES[i]])) {
      const k = chaveLista(item)
      if (noMes.has(k)) continue
      noMes.add(k)
      const atual = contagem.get(k)
      if (atual) atual.meses += 1
      else contagem.set(k, { nome: item, meses: 1 })
    }
  }

  return [...contagem.values()]
    .map((p) => ({ ...p, faixa: faixaDeRecorrencia(p.meses, totalMeses) }))
    .sort((a, b) => b.meses - a.meses || a.nome.localeCompare(b.nome, 'pt-BR'))
}

export function analisarPublicidade(
  aba: AbaParseada,
  fechado: MesFechado,
  pracas: string,
): AnalisePublicidade {
  const s = (id: string, rotulo: string) => serieDoIndicador(aba, id, rotulo, fechado)

  const series = {
    leads: s('PUB-01', 'Leads gerados'),
    impressoes: s('PUB-02', 'Impressões digitais'),
    cliques: s('PUB-03', 'Cliques'),
    ooh: s('PUB-04', 'Impactos OOH'),
    aeroporto: s('PUB-05', 'Fluxo aeroportuário'),
    midia: s('PUB-07', 'Investimento de mídia'),
    producao: s('PUB-08', 'Produção'),
  }

  const alcanceTotal = series.impressoes.total + series.ooh.total + series.aeroporto.total
  const alcancePartes = [
    { rotulo: 'Impressões digitais', serie: series.impressoes },
    { rotulo: 'Impactos OOH', serie: series.ooh },
    { rotulo: 'Fluxo aeroportuário', serie: series.aeroporto },
  ]
    .filter((p) => p.serie.temDado)
    .map((p) => ({ rotulo: p.rotulo, valor: p.serie.total }))
    .map((p) => ({ ...p, participacao: alcanceTotal > 0 ? p.valor / alcanceTotal : 0 }))

  const investimentoTotal = series.midia.total + series.producao.total
  const investimentoPartes = [
    { rotulo: 'Mídia', serie: series.midia },
    { rotulo: 'Produção', serie: series.producao },
  ]
    .filter((p) => p.serie.temDado)
    .map((p) => ({ rotulo: p.rotulo, valor: p.serie.total }))
    .map((p) => ({ ...p, participacao: investimentoTotal > 0 ? p.valor / investimentoTotal : 0 }))

  const ctrValor =
    series.impressoes.total > 0 ? (series.cliques.total / series.impressoes.total) * 100 : null
  // CPL só fecha se numerador e denominador cobrirem as MESMAS campanhas: os
  // leads vêm só de Capital de Giro e Custeio Agrícola (ressalva da própria
  // planilha em PUB-01), então o investimento também tem que ser só o delas.
  // Sem leads ou sem campanhas de lead conferidas (caso de 2025), não há CPL —
  // nem "R$ 0", que leria como lead de graça.
  const cplValor =
    series.leads.total > 0 && INVESTIMENTO_LEAD > 0 ? INVESTIMENTO_LEAD / series.leads.total : null
  const cpmValor =
    series.impressoes.total > 0 ? series.midia.total / (series.impressoes.total / 1000) : null

  const ctr: Derivada = {
    rotulo: 'CTR',
    valor: ctrValor,
    formatado: ctrValor == null ? '—' : `${nf(ctrValor, 2)}%`,
    conta: `${nf(series.cliques.total)} cliques ÷ ${nf(series.impressoes.total)} impressões`,
    leitura: 'Taxa de clique sobre a mídia digital veiculada',
  }

  const cpl: Derivada = {
    rotulo: 'Custo por lead',
    valor: cplValor,
    formatado: cplValor == null ? '—' : `R$ ${nf(cplValor, 2)}`,
    conta:
      `R$ ${nf(INVESTIMENTO_LEAD)} em ${CAMPANHAS_LEAD.length} campanhas ` +
      `÷ ${nf(series.leads.total)} leads`,
    leitura: 'Só as campanhas com meta de lead: Capital de Giro e Custeio Agrícola',
  }

  const cpm: Derivada = {
    rotulo: 'CPM',
    valor: cpmValor,
    formatado: cpmValor == null ? '—' : `R$ ${nf(cpmValor, 2)}`,
    // aqui o total de mídia É o certo: as impressões vêm de todas as campanhas
    conta: `R$ ${nf(series.midia.total)} de mídia ÷ ${nf(series.impressoes.total / 1000)} mil impressões`,
    leitura: 'Custo por mil impressões, sobre toda a mídia veiculada',
  }

  // CTR mês a mês: só existe onde os dois indicadores têm valor no mesmo mês
  const ctrMensal: PontoMes[] = series.impressoes.pontos.map((p, i) => {
    const cliques = series.cliques.pontos[i]?.valor
    const impressoes = p.valor
    return {
      mes: p.mes,
      indice: p.indice,
      valor:
        cliques != null && impressoes != null && impressoes > 0
          ? (cliques / impressoes) * 100
          : null,
    }
  })

  return {
    series,
    alcanceTotal,
    alcancePartes,
    investimentoTotal,
    investimentoPartes,
    campanhasLead: CAMPANHAS_LEAD,
    investimentoLead: INVESTIMENTO_LEAD,
    // só faz sentido avisar quando há leads entrando na conta
    leadDesatualizado:
      series.leads.temDado &&
      (fechado.ano > CONFERIDO_ATE.ano ||
        (fechado.ano === CONFERIDO_ATE.ano && fechado.indice > CONFERIDO_ATE.indice)),
    leadConferidoAte: `${CONFERIDO_ATE.nome}/${CONFERIDO_ATE.ano}`,
    ctr,
    cpl,
    cpm,
    ctrMensal,
    produtos: recorrenciaDeProdutos(aba, fechado),
    ufs: ufsDasPracas(pracas),
  }
}
