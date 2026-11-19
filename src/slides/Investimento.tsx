import type { DadosPublicidade } from '../data/publicidade'
import { BarrasEmpilhadasMes, COR_SERIE, COR_SERIE_2 } from '../charts/graficos'
import { formatCompact, formatadorFixo, formatFull } from '../lib/numbers'
import { Assinatura, Eyebrow, MARGEM, Nota, NumeroHeroi, Palco } from './editorial'

/**
 * Investimento executado. Mídia e produção são a mesma unidade e somam um todo,
 * então empilham na mesma barra — o total do mês é a altura da coluna, e o
 * desenho revela o que a soma esconde quando o pico vem da produção.
 *
 * Em 2025 a planilha traz a produção (PUB-08) só como total anual, sem meses.
 * Aí o slide mostra a composição do ano — mídia + produção numa barra única —
 * e o gráfico mês a mês fica só com a mídia: espalhar o total da produção pelos
 * meses inventaria um ritmo que a planilha não tem.
 */
export function Investimento({ dados }: { dados: DadosPublicidade | null }) {
  const a = dados?.analise
  const total = a?.investimentoTotal ?? null
  const producaoAnual = a != null && a.producaoTotal != null && !a.producaoMensal
  const largura = 1280 - MARGEM * 2

  return (
    <Palco veu="nenhum">
      <div style={{ position: 'absolute', left: MARGEM, top: 60 }}>
        <Eyebrow>Investimento executado</Eyebrow>
      </div>

      <div style={{ position: 'absolute', left: MARGEM, top: 132 }}>
        <NumeroHeroi
          valor={total}
          formatar={formatadorFixo(total ?? 0, { moeda: true })}
          tamanho={118}
          titulo={total == null ? undefined : formatFull(total, { moeda: true })}
        />

        {a && (
          <div style={{ marginTop: 26, display: 'flex', gap: 46 }}>
            {a.investimentoPartes.map((p, i) => (
              <div key={p.rotulo} style={{ display: 'flex', alignItems: 'baseline', gap: 11 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 2,
                    background: i === 0 ? COR_SERIE : COR_SERIE_2,
                  }}
                />
                <span style={{ fontSize: 18, color: 'var(--areia)' }}>
                  {p.rotulo}{' '}
                  <b style={{ fontWeight: 600 }}>{formatCompact(p.valor, { moeda: true })}</b>
                  <span style={{ color: 'rgb(245 240 226 / 52%)' }}>
                    {' '}
                    · {(p.participacao * 100).toFixed(0)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* composição do ano: uma barra só, mídia + produção */}
        {a && producaoAnual && (
          <div
            aria-hidden="true"
            style={{ display: 'flex', gap: 2, width: largura, height: 14, marginTop: 20 }}
          >
            {a.investimentoPartes.map((p, i) => (
              <div
                key={p.rotulo}
                title={`${p.rotulo}: ${formatFull(p.valor, { moeda: true })}`}
                style={{
                  width: `${p.participacao * 100}%`,
                  minWidth: 6,
                  background: i === 0 ? COR_SERIE : COR_SERIE_2,
                  borderRadius:
                    i === 0 ? '3px 1px 1px 3px' : i === a.investimentoPartes.length - 1 ? '1px 3px 3px 1px' : 1,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {a && producaoAnual && (
        <div
          style={{
            position: 'absolute',
            left: MARGEM,
            top: 344,
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--areia)',
          }}
        >
          Mídia · mês a mês
        </div>
      )}

      {a && (
        <div style={{ position: 'absolute', left: MARGEM, top: producaoAnual ? 384 : 356 }}>
          <BarrasEmpilhadasMes
            a={a.series.midia.pontos}
            b={a.series.producao.pontos}
            rotuloA="Mídia"
            rotuloB="Produção"
            formatar={(n) => formatCompact(n, { moeda: true })}
            largura={largura}
            altura={producaoAnual ? 160 : 188}
            // as duas séries já aparecem rotuladas com valor logo acima
            legenda={false}
          />
        </div>
      )}

      <Nota style={{ position: 'absolute', left: MARGEM, right: MARGEM, bottom: 70 }}>
        {a && producaoAnual ? (
          <>
            Composição do ano: mídia executada (PUB-07), somada mês a mês, e produção (PUB-08),
            que a planilha registra só como total anual — por isso a produção não entra no gráfico
            mensal.
          </>
        ) : a && !a.series.producao.temDado ? (
          <>
            Investimento de mídia executado (PUB-07), somado mês a mês. Produção (PUB-08) sem
            registro na planilha de {dados?.fechado.ano}.
            {a.series.midia.lacunas.length > 0 &&
              ` Sem mídia registrada em ${a.series.midia.lacunas.join(', ')}.`}
          </>
        ) : (
          <>
            Colunas somam mídia (PUB-07) e produção (PUB-08) de cada mês.
            {a?.series.producao.pico &&
              ` O pico de ${a.series.producao.pico.mes} vem da produção, não da veiculação.`}
          </>
        )}
      </Nota>

      <Assinatura periodo={dados?.fechado.periodo ?? null} />
    </Palco>
  )
}
