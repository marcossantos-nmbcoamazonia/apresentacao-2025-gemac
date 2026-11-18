# Apresentação COPAC — Marketing e Comunicação

Deck web que se comporta como uma apresentação em slides e lê os números direto
da planilha de fechamento, pela API. Substitui a montagem manual do PowerPoint:
ninguém digita indicador, e o próprio site mostra até que mês os dados estão
preenchidos.

Esta versão é o **fechamento de 2025**: capa e seção de Publicidade, alimentadas
pela aba `01 PUBLICIDADE - 2025` (constante `ABA_PUBLICIDADE` em
`src/data/publicidade.ts`). O ano não é configurado: sai do cabeçalho
`Acum. 2025` da própria aba.

## Rodando

```bash
npm install
npm run dev          # http://localhost:5173
```

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção em `dist/` |
| `npm run preview` | serve o build |
| `npm run conferir` | **imprime no terminal os números que o slide vai mostrar** |
| `npm run fontes` | rebaixa a Inter Tight para `public/fonts` |
| `npm run extract-assets` | reextrai as imagens do `.pptx` para `public/assets` |

`npm run conferir` é a ferramenta do dia a dia: usa as mesmas funções da
aplicação, então se a planilha mudar de formato ou avançar de mês, aparece ali
antes de virar problema na reunião.

## Apresentando

| Tecla | Ação |
|---|---|
| `→` `←` `espaço` `PgUp/PgDn` | navegar |
| `Home` `End` | primeiro / último slide |
| `F` | tela cheia |
| `O` | grade de miniaturas |
| `R` | recarregar os dados da planilha |

Também funciona por swipe no celular e por trackpad. Cada slide tem link direto:
`#/3` abre o terceiro. A barra inferior some sozinha durante a fala e volta ao
primeiro movimento do mouse.

A pílula à esquerda da barra é o indicador da automação: mostra
**"Dados até Dez/2025"** e há quanto tempo a planilha foi lida. Fica amarela
enquanto carrega e laranja se a API não responder — nunca se apresenta um número
velho sem aviso.

## Como os números são calculados

**O acumulado é somado aqui, mês a mês — não vem da coluna `Acum. 2025`.**
Em 2025 essa coluna bate com a soma em PUB-02, PUB-03 e PUB-04, mas **não em
PUB-07**: a planilha traz R$ 27.479.215,27 e a soma de Fev → Dez dá
R$ 30.688.499,93. A diferença é exatamente o valor de Nov (R$ 3.209.284,66),
o que sugere que a fórmula da planilha deixa Nov de fora (a confirmar com quem mantém a
planilha). O deck mostra a soma (R$ 30,7 Mi).
`npm run conferir` compara cada acumulado com a coluna e aponta a divergência.

**O mês de fechamento é deduzido dos dados**, não configurado: é o último mês
com valor em qualquer indicador numérico (em 2025, Dez).

**Buracos na série são respeitados.** Mês vazio aparece tracejado, nunca como
zero. Em 2025: impressões e cliques sem dado em Jan, Mar, Abr e Mai; OOH em
Jan, Fev e Mar; mídia em Jan e Mar.

**Indicador vazio some, não vira zero.** Em 2025 a planilha não tem fluxo
aeroportuário (PUB-05) nem produção (PUB-08). Os slides os escondem — sem
"Produção R$ 0 · 0%" — e voltam sozinhos se as linhas forem preenchidas.

**Leads (PUB-01) só têm Jun (2.167) e Dez (74)**, total 2.241. O CPL fica
oculto até as campanhas de lead de 2025 (Capital de Giro e Custeio Agrícola,
conforme a ressalva da planilha) serem listadas com o valor do PI em
`src/data/campanhasLead.ts`. Dividir a mídia inteira pelos leads daria um
custo inflado, porque a maior parte da verba não tem meta de lead.

**A variação é mês contra mês**, sempre rotulada com os meses comparados
(`Ago vs. Jul`), para não ser lida como variação do acumulado.

## Marketing de influência (lâmina 11)

Vem de outra planilha (`16qaRdOT…`, aba `base`, constante `PLANILHA_INFLUENCIA`
em `src/data/influencia.ts`): o quadro "Big Numbers" da estratégia Always On,
Out – Dez 2025. Segue o mesmo desenho da lâmina de 2026, com duas diferenças
que vêm da planilha:

- os meses chegam sem ano ("OUT"), então o ano sai de `ANO_PADRAO` (2025);
- não há os top 5 por views. No lugar, o bloco "Campanhas do mês" vira o top 5
  de campanhas por nº de conteúdos e a coluna "campanhas mês a mês".

Totais (influenciadores, engajamento) vêm da coluna TOTAL, nunca da soma dos
meses: influenciadores são únicos no período e engajamento é taxa. O
`npm run conferir` confere as somas internas da planilha, inclusive se as
campanhas de cada mês fecham o total de conteúdos do mês.

## Estrutura

```
src/
  api/client.ts          fetch + cache de sessão (5 min) com fallback para cache vencido
  api/parseSheet.ts      parser genérico das abas de área — serve as 7 abas
  data/publicidade.ts    regra de negócio da seção (funções puras) + nome da aba
  data/influencia.ts     parser do consolidado de influência (formatos 2025 e 2026)
  data/campanhasLead.ts  campanhas de lead (base do CPL) — falta preencher 2025
  data/usePublicidade.ts casca React sobre a anterior
  data/resolveClosedMonth.ts   a automação do mês fechado
  lib/numbers.ts         pt-BR: parse, formato compacto (317 Mi, 867 Mil), variação
  lib/listas.ts          normaliza os campos de texto livre (produtos, praças)
  deck/                  motor de apresentação (canvas 1280x720, atalhos, overview)
  slides/                os dez slides
scripts/                 extração de assets, download de fonte, conferência de dados
```

O canvas de autoria é **1280×720**, que é o slide do PPTX na escala exata
(13,333 pol × 96 dpi). Por isso a geometria dos slides usa os mesmos números do
arquivo original, e o `SlideFrame` só escala o conjunto para caber na tela.

## Marca

Cores e tipografia do
[brandcenter](https://brandcenter.bancoamazonia.com.br/expressao-visual/cores/):
verde escuro `#003C2D`, verde claro `#00E12D`, verde neon `#E6FF55`, areia
`#F5F5C8`. Os tons de aplicação (`#002A23`, `#005240`, `#4A170D`) são os valores
reais medidos no deck-fonte.

A fonte oficial é a **Inter Tight** (fallback Arial, como define a marca). Ela é
servida junto com o site, e não pelo Google Fonts: a apresentação roda em sala de
reunião e não pode cair para Arial se a rede oscilar.

Logo, símbolo, marcador `#INTERNA` e as fotos vêm do próprio `.pptx`, extraídos
por `npm run extract-assets`.

## Próximas seções

O parser e o motor já estão prontos para o resto do deck: cada seção nova é um
componente de slide mais o `range` correspondente (`02 DIGITAL`, `03 EVENTOS`,
`04 EVENTOS PROPRIET`, `05 IMPRENSA`, `06 CENTRO CULTURAL`, `07 CCBA DIGITAL`).
