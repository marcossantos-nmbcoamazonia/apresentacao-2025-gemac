/**
 * Campanhas com objetivo de geração de lead — base do CPL.
 *
 * POR QUE ISTO EXISTE
 *
 * PUB-01 (leads) tem na própria planilha a ressalva "So Capital de Giro e
 * Custeio Agricola": só essas campanhas geram lead. Dividir o investimento de
 * mídia INTEIRO (PUB-07 — institucional, always on, patrocínios e tudo mais)
 * por esses leads inflaria o custo várias vezes. O numerador tem que cobrir as
 * mesmas campanhas que o denominador.
 *
 * DE ONDE VEM
 *
 * A planilha de fechamento não tem investimento por campanha — ela só tem o
 * total mensal. Os valores vêm da planilha de PIs aprovados, coluna de valor
 * autorizado.
 *
 * 2025
 *
 * A aba "01 PUBLICIDADE - 2025" tem leads só em Jun (2.167) e Dez (74). As
 * campanhas de lead de 2025 ainda não foram conferidas contra os PIs, então a
 * lista está vazia e o slide de eficiência esconde o CPL e o bloco de
 * campanhas sozinho. Os PIs que estavam aqui (2026/15, 2026/16 e 2026/18) são
 * campanhas de 2026 e não podem entrar na conta de 2025.
 *
 * COMO ATUALIZAR
 *
 * Se PUB-01 de 2025 for preenchido, inclua aqui as campanhas de lead de 2025
 * com o número do PI e ajuste CONFERIDO_ATE.
 */

export interface CampanhaLead {
  /** número do PI, para auditoria contra a planilha de aprovados */
  pi: string
  nome: string
  /** meios contratados, como constam no PI */
  meios: string
  /** valor autorizado, em reais */
  investimento: number
  agencia: string
}

/**
 * Até que mês de fechamento esta lista foi conferida.
 *
 * É o contrapeso de ter o numerador chumbado e o denominador vivo: os leads
 * vêm da planilha e avançam sozinhos a cada mês, enquanto a lista abaixo só
 * anda quando alguém a edita. `analisarPublicidade` compara isto com o mês
 * fechado e avisa no slide quando a planilha passa à frente — mas só se
 * houver leads no período.
 */
export const CONFERIDO_ATE = { indice: 11, nome: 'Dez', ano: 2025 } // 0 = Jan

export const CAMPANHAS_LEAD: CampanhaLead[] = []

export const INVESTIMENTO_LEAD = CAMPANHAS_LEAD.reduce((s, c) => s + c.investimento, 0)

/** "2025/15, 2025/16 e 2025/18" — para a nota de rodapé do slide. */
export function pisDasCampanhas(): string {
  const pis = CAMPANHAS_LEAD.map((c) => c.pi).sort()
  if (pis.length <= 1) return pis.join('')
  return `${pis.slice(0, -1).join(', ')} e ${pis[pis.length - 1]}`
}
