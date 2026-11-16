import type { DadosPublicidade } from '../data/publicidade'
import { BarraParticipacao } from '../charts/graficos'
import { formatCompact, formatadorFixo, formatFull } from '../lib/numbers'
import { Assinatura, Eyebrow, Folhagem, MARGEM, Nota, NumeroHeroi, Palco } from './editorial'

/**
 * O número herói é a soma das frentes de veiculação com dado no período, e a
 * barra logo abaixo mostra de onde ele vem — sem isso, "1,1 bilhão" seria um
 * número sem endereço. Em 2025 o fluxo aeroportuário está vazio na planilha, e
 * a frente simplesmente não entra (em vez de aparecer como 0%).
 */

const POR_EXTENSO = ['nenhuma', 'uma', 'duas', 'três']

/** "impressões digitais e impactos de OOH" */
function juntar(itens: string[]): string {
  if (itens.length <= 1) return itens.join('')
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}
export function Alcance({ dados }: { dados: DadosPublicidade | null }) {
  const a = dados?.analise
  const total = a?.alcanceTotal ?? null
  const partes = a?.alcancePartes ?? []
  const frentes = partes.length
  const ausentes = a
    ? [
        !a.series.impressoes.temDado && 'impressões digitais',
        !a.series.ooh.temDado && 'impactos de OOH',
        !a.series.aeroporto.temDado && 'fluxo aeroportuário',
      ].filter((x): x is string => Boolean(x))
    : []

  return (
    <Palco veu="nenhum">
      <Folhagem lado="direita" largura={560} opacidade={0.34} />

      <div style={{ position: 'absolute', left: MARGEM, top: 68 }}>
        <Eyebrow>Alcance do período</Eyebrow>
      </div>

      <div style={{ position: 'absolute', left: MARGEM, top: 148 }}>
        <NumeroHeroi
          valor={total}
          formatar={formatadorFixo(total ?? 0)}
          tamanho={196}
          titulo={total == null ? undefined : formatFull(total)}
        />
        <div
          style={{
            // a vírgula de "1,1 Bi" desce abaixo da linha de base a 196px
            marginTop: 40,
            fontSize: 30,
            fontWeight: 300,
            color: 'var(--areia)',
            letterSpacing: '-0.015em',
          }}
        >
          {frentes <= 1
            ? 'impactos entregues na veiculação'
            : `impactos entregues em ${POR_EXTENSO[frentes] ?? frentes} frentes de veiculação`}
        </div>
      </div>

      {a && (
        <div style={{ position: 'absolute', left: MARGEM, top: 422 }}>
          <BarraParticipacao
            partes={a.alcancePartes}
            formatar={(n) => formatCompact(n)}
            largura={1280 - MARGEM * 2}
          />
        </div>
      )}

      <Nota style={{ position: 'absolute', left: MARGEM, right: MARGEM, bottom: 72 }}>
        {partes.length > 0 &&
          `Soma de ${juntar(partes.map((p) => p.rotulo.toLowerCase().replace('impactos ooh', 'impactos de OOH')))}. `}
        São metodologias de medição distintas e o total não é deduplicado — uma mesma pessoa
        pode ser contada em mais de uma frente.
        {ausentes.length > 0 &&
          ` Sem registro na planilha de ${dados?.fechado.ano ?? ''}: ${juntar(ausentes)}.`}
      </Nota>

      <Assinatura periodo={dados?.fechado.periodo ?? null} />
    </Palco>
  )
}
