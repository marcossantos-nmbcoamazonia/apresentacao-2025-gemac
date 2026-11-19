import { ABA_PUBLICIDADE, type DadosPublicidade } from '../data/publicidade'
import { montarDistribuicao, type Meio } from '../data/distribuicaoMidia'
import { formatCompact, formatadorFixo, formatFull, formatPercent } from '../lib/numbers'
import { Assinatura, Eyebrow, MARGEM, Nota, NumeroHeroi, Palco, TituloDisplay } from './editorial'

/**
 * Distribuição de mídia por meio: quanto cada meio recebeu e o que entregou.
 *
 * Uma linha por meio, ordenada por investimento. A barra é a participação no
 * investimento — a única medida comum a todos. A entrega fica ao lado, cada uma
 * na sua unidade (inserções, impressões, impactos, publicações), e não vira
 * barra: comparar 669 Mi de impressões com 3 publicações de revista não diz nada.
 */

const COLUNAS = '170px 1fr 132px 64px 236px'
const TEXTO_FRACO = 'rgb(245 240 226 / 52%)'
const FIO = '1px solid rgb(245 240 226 / 12%)'

/** 202.799.548 → "203 Mi" · 46.904 → "46.904" · 1 → "1" */
const entregaCompacta = (n: number | null) => formatCompact(n)

function Linha({ m, maior }: { m: Meio; maior: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: COLUNAS,
        gap: 20,
        alignItems: 'center',
        height: 42,
        borderBottom: FIO,
      }}
    >
      <span style={{ fontSize: 17, fontWeight: 500, color: 'var(--areia)', whiteSpace: 'nowrap' }}>
        {m.meio}
      </span>

      <span
        aria-hidden="true"
        style={{
          display: 'block',
          height: 12,
          width: `${(m.investimento / maior) * 100}%`,
          minWidth: 3,
          background: 'var(--lima)',
          opacity: m.investimento === maior ? 1 : 0.62,
          borderRadius: 2,
        }}
      />

      <span
        title={formatFull(m.investimento, { moeda: true })}
        style={{
          fontSize: 17,
          fontWeight: 600,
          color: 'var(--areia)',
          textAlign: 'right',
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatCompact(m.investimento, { moeda: true })}
      </span>

      <span
        style={{
          fontSize: 14,
          color: TEXTO_FRACO,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatPercent(m.participacao * 100, 1)}
      </span>

      <span
        title={m.entrega == null ? undefined : `${formatFull(m.entrega)} ${m.unidade}`}
        style={{ textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
      >
        <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--lima)' }}>
          {entregaCompacta(m.entrega)}
        </span>
        <span style={{ fontSize: 13.5, color: TEXTO_FRACO }}> {m.unidade}</span>
      </span>
    </div>
  )
}

export function Distribuicao({ dados }: { dados: DadosPublicidade | null }) {
  const impressoes = dados?.analise.series.impressoes
  const dist = montarDistribuicao(impressoes?.temDado ? impressoes.total : null)
  const maior = dist.meios[0]?.investimento ?? 1
  const executado = dados?.analise.series.midia

  const cabecalho = ['Meio', 'Participação no investimento', 'Investimento', '%', 'Entrega']

  return (
    <Palco veu="nenhum" textura="/assets/mosaico-2.jpg">
      <div style={{ position: 'absolute', left: MARGEM, top: 60 }}>
        <Eyebrow>Distribuição de mídia</Eyebrow>
        <TituloDisplay tamanho={46} style={{ marginTop: 16 }}>
          Onde a mídia foi veiculada
        </TituloDisplay>
      </div>

      <div style={{ position: 'absolute', right: MARGEM, top: 54, textAlign: 'right' }}>
        <NumeroHeroi
          valor={dist.total}
          formatar={formatadorFixo(dist.total, { moeda: true })}
          tamanho={64}
          titulo={formatFull(dist.total, { moeda: true })}
        />
        <div style={{ fontSize: 15, fontWeight: 300, color: 'rgb(245 240 226 / 72%)', marginTop: 10 }}>
          investidos em {dist.meios.length} meios
        </div>
      </div>

      <div style={{ position: 'absolute', left: MARGEM, right: MARGEM, top: 196 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: COLUNAS,
            gap: 20,
            paddingBottom: 10,
            borderBottom: '1px solid rgb(245 240 226 / 24%)',
          }}
        >
          {cabecalho.map((c, i) => (
            <span
              key={c}
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--verde-neon)',
                textAlign: i >= 2 ? 'right' : 'left',
                whiteSpace: 'nowrap',
              }}
            >
              {c}
            </span>
          ))}
        </div>

        {dist.meios.map((m) => (
          <Linha key={m.meio} m={m} maior={maior} />
        ))}
      </div>

      <Nota style={{ position: 'absolute', left: MARGEM, right: MARGEM, bottom: 66 }}>
        Internet inclui redes sociais; suas impressões são as da planilha de fechamento (PUB-02),
        as mesmas dos demais slides. TV em inserções, rádio em inserções, DOOH em impactos, jornal e
        revista em publicações — unidades distintas, por isso as entregas não se somam.
        {executado?.temDado &&
          Math.abs(executado.total - dist.total) >= 1 &&
          ` O investimento de mídia executado da aba ${ABA_PUBLICIDADE} soma ${formatFull(executado.total, { moeda: true })}, ${formatCompact(Math.abs(executado.total - dist.total), { moeda: true })} ${executado.total > dist.total ? 'acima' : 'abaixo'} do total por meio.`}
      </Nota>

      <Assinatura periodo={dados?.fechado.periodo ?? null} />
    </Palco>
  )
}
