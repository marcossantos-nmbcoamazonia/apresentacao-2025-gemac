/**
 * Distribuição de mídia por meio em 2025 — investimento e entrega de cada meio.
 *
 * DE ONDE VEM
 *
 * Do consolidado de veiculação por meio (tabela MEIO × Investimento ×
 * Impressões/Cliques/Impactos) enviado pelo Núcleo de Mídia em 19/11/2026. Ainda
 * não há rota da API para ela, então os valores estão transcritos aqui. Total
 * geral da tabela: R$ 32.894.354,89 — conferido por `npm run conferir`.
 *
 * QUATRO REGRAS
 *
 * 1. **Redes sociais entram em Internet.** A tabela traz as duas linhas
 *    separadas (redes com R$ 0,00); o investimento é somado em Internet.
 * 2. **A entrega de Internet vem da planilha de fechamento**, não da tabela:
 *    são as impressões digitais de PUB-02 (669 Mi), o mesmo número dos outros
 *    slides. A tabela traz 287,7 Mi + 3,7 Mi, outra base de medição.
 * 3. **Cada meio tem a sua unidade de entrega** — inserções, impressões,
 *    impactos, publicações. Somar entregas de meios diferentes não faz sentido,
 *    por isso não há "total de entrega" (o "494 Mi" da tabela mistura tudo).
 * 4. **O total bate com o investimento executado (PUB-07).** O número oficial
 *    é o da planilha de fechamento, o mesmo do slide de investimento. A
 *    diferença entre ele e o total da tabela (R$ 100.657,48 em 19/11/2026,
 *    saldo de dezembro) entra em Internet — decisão do Núcleo de Mídia. É
 *    calculada, não digitada: se PUB-07 mudar, as duas lâminas seguem iguais,
 *    e `npm run conferir` mostra o ajuste aplicado.
 */

/** Meio que absorve a diferença até o investimento executado de PUB-07. */
export const MEIO_DO_AJUSTE = 'Internet'

export type UnidadeEntrega = 'inserções' | 'impressões' | 'impactos' | 'publicações'

export interface MeioDef {
  meio: string
  investimento: number
  /** null = vem da planilha de fechamento (Internet ← PUB-02) */
  entrega: number | null
  unidade: UnidadeEntrega
}

export const MEIOS_2025: MeioDef[] = [
  // Internet + Redes sociais (R$ 11.373.263,48 + R$ 0,00)
  { meio: 'Internet', investimento: 11_373_263.48 + 0, entrega: null, unidade: 'impressões' },
  { meio: 'TV aberta', investimento: 7_225_903.1, entrega: 7_235, unidade: 'inserções' },
  { meio: 'DOOH', investimento: 6_320_980.81, entrega: 202_799_548, unidade: 'impactos' },
  { meio: 'Jornal', investimento: 2_670_712.39, entrega: 106, unidade: 'publicações' },
  { meio: 'Rádio', investimento: 2_554_661.98, entrega: 46_904, unidade: 'inserções' },
  { meio: 'TV fechada', investimento: 1_717_799.99, entrega: 1_517, unidade: 'inserções' },
  { meio: 'TV segmentada', investimento: 701_917.14, entrega: 1_008, unidade: 'inserções' },
  { meio: 'Revista', investimento: 329_116.0, entrega: 3, unidade: 'publicações' },
]

/** "Total geral" da tabela-fonte, para conferência. */
export const TOTAL_TABELA = 32_894_354.89

export interface Meio extends MeioDef {
  /** participação no investimento total, de 0 a 1 */
  participacao: number
  /** a entrega veio da planilha de fechamento, não da tabela */
  daPlanilha: boolean
  /** quanto foi somado ao valor da tabela para fechar com PUB-07 */
  ajuste: number
}

export interface DistribuicaoMidia {
  meios: Meio[]
  total: number
  /** diferença PUB-07 − total da tabela, somada em MEIO_DO_AJUSTE */
  ajuste: number
}

/**
 * Monta a distribuição: impressões de PUB-02 em Internet e, quando o
 * investimento executado de PUB-07 é conhecido, a diferença para ele somada em
 * MEIO_DO_AJUSTE — o total passa a ser o mesmo do slide de investimento.
 */
export function montarDistribuicao(
  impressoesInternet: number | null,
  investimentoExecutado: number | null = null,
): DistribuicaoMidia {
  const totalTabela = MEIOS_2025.reduce((s, m) => s + m.investimento, 0)
  const ajuste = investimentoExecutado == null ? 0 : investimentoExecutado - totalTabela

  const comAjuste = MEIOS_2025.map((m) => {
    const delta = m.meio === MEIO_DO_AJUSTE ? ajuste : 0
    return { ...m, investimento: m.investimento + delta, ajuste: delta }
  })
  const total = comAjuste.reduce((s, m) => s + m.investimento, 0)

  const meios = comAjuste
    .map((m) => ({
      ...m,
      entrega: m.entrega ?? impressoesInternet,
      daPlanilha: m.entrega == null,
      participacao: total > 0 ? m.investimento / total : 0,
    }))
    .sort((a, b) => b.investimento - a.investimento)
  return { meios, total, ajuste }
}
