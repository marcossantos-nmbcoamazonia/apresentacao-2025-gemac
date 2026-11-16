import type { DadosPublicidade } from '../data/publicidade'
import type { SerieMensal } from '../data/publicidadeAnalise'
import { BarrasMes } from '../charts/graficos'
import { formatCompact } from '../lib/numbers'
import { Assinatura, Eyebrow, MARGEM, Nota, Palco, TituloDisplay } from './editorial'

/**
 * Evolução mês a mês em *small multiples*.
 *
 * Impressões (669 Mi), cliques (1,5 Mi) e OOH (431 Mi) estão a ordens de
 * grandeza de distância. Num gráfico só, com dois eixos, as séries menores
 * viram uma linha reta colada no chão — por isso três gráficos lado a lado,
 * cada um com a sua escala, compartilhando apenas o eixo de meses.
 *
 * Os painéis saem da ordem de preferência abaixo, pulando série vazia: em 2025
 * a planilha não tem leads, e um painel inteiro tracejado não diz nada.
 */

const LARGURA = (1280 - MARGEM * 2 - 72 * 2) / 3
const ALTURA = 210

function Painel({ serie }: { serie: SerieMensal }) {
  return (
    <div style={{ width: LARGURA }}>
      <div
        style={{
          fontSize: 19,
          fontWeight: 500,
          color: 'var(--areia)',
          marginBottom: 4,
        }}
      >
        {serie.rotulo}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: 'var(--lima)',
          marginBottom: 26,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatCompact(serie.total)}
      </div>

      <BarrasMes
        pontos={serie.pontos}
        formatar={(n) => formatCompact(n)}
        largura={LARGURA}
        altura={ALTURA}
      />
    </div>
  )
}

export function Evolucao({ dados }: { dados: DadosPublicidade | null }) {
  const a = dados?.analise
  const series = a
    ? [a.series.impressoes, a.series.cliques, a.series.leads, a.series.ooh]
        .filter((s) => s.temDado)
        .slice(0, 3)
    : []

  // as ressalvas saem da própria série, não de uma lista fixa no código
  const lacunas = series
    .filter((s) => s.lacunas.length > 0)
    // só a inicial em minúscula: "Impactos OOH" -> "impactos OOH", não "impactos ooh"
    .map((s) => `${s.rotulo.charAt(0).toLowerCase()}${s.rotulo.slice(1)} sem dado em ${s.lacunas.join(', ')}`)

  return (
    <Palco veu="nenhum">
      <div style={{ position: 'absolute', left: MARGEM, top: 60 }}>
        <Eyebrow>Evolução mês a mês</Eyebrow>
        <TituloDisplay tamanho={46} style={{ marginTop: 16 }}>
          O ritmo da veiculação
        </TituloDisplay>
      </div>

      <div style={{ position: 'absolute', left: MARGEM, top: 226, display: 'flex', gap: 72 }}>
        {series.map((s) => (
          <Painel key={s.id} serie={s} />
        ))}
      </div>

      <Nota style={{ position: 'absolute', left: MARGEM, right: MARGEM, bottom: 76 }}>
        Cada série tem escala própria — as três não cabem num eixo comum. Barra em destaque é o
        pico do período.
        {lacunas.length > 0 && ` Meses sem registro aparecem tracejados: ${lacunas.join('; ')}.`}
      </Nota>

      <Assinatura periodo={dados?.fechado.periodo ?? null} />
    </Palco>
  )
}
