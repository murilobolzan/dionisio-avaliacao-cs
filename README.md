# Dionísio · Qualidade de Atendimento (CS)

Front-end funcional (sem backend) para **avaliar atendimentos de CS por média ponderada**, **guardar o histórico** e **apresentar o resultado toda semana** — do time inteiro e de cada pessoa.

## No ar

**https://murilobolzan.github.io/dionisio-avaliacao-cs/**

Publicado por GitHub Pages, direto da branch `main`: todo `git push` republica o site em cerca de um minuto.

## Como rodar localmente

Não tem build, não tem `npm install`. Duas opções:

1. **Abrir direto:** dê duplo clique em `index.html` (funciona em `file://` — os scripts são clássicos, sem ES modules).
2. **Servidor local** (recomendado, e necessário para o "copiar imagem"): extensão *Live Server* no VS Code → botão **Go Live**, ou:

```bash
npx serve .
```

## Telas

| Tela | O que faz |
|---|---|
| **Dashboard de Qualidade** | A tela de abertura e a da apresentação semanal. Nota média, % dentro do esperado, **quebra por membro do time**, ranking, média por critério, evolução semana a semana e pontos de atenção. |
| **Nova avaliação** | Onde toda avaliação nasce: você digita os dados do atendimento, dá as notas (0 a 5), anexa os prints da conversa, **salva** (entra no dashboard e no histórico) e copia a imagem. |
| **Avaliações registradas** | Tudo que já foi avaliado, com filtro por semana e por CS. Dá para reabrir e editar, copiar a imagem de novo ou excluir. |

A base **começa vazia**: só aparece no dashboard o que você avaliar. Os 14 tickets fictícios e as 8 avaliações de teste que existiam antes ficaram guardados em `js/dados-demo.js`, fora do app.

> A **Fila de Tickets** e a tela de avaliar-por-ticket continuam no código, mas escondidas do menu: elas dependem de uma lista de tickets vinda de um sistema. Quando `TICKETS` (em `js/dados.js`) voltar a ter dados, é só tirar o `hidden` do grupo "Operações" no `index.html`.

## Regra de cálculo (média ponderada)

São **4 critérios**, com peso fixo e escala descrita nota por nota:

| # | Critério | Peso |
|---|---|---|
| 1 | Entendeu o problema de fato | 1 |
| 2 | Resolveu de fato | 2 |
| 3 | Qualidade técnica da resposta | 2 |
| 4 | Tom adequado, empático e no padrão Dionísio | 1 |
|  | **Σ pesos** | **6** |

```
ponderado(critério) = nota (0, 1, 2, 3, 4 ou 5) × peso
nota final          = Σ ponderado ÷ 6           → 0 a 5, com 2 decimais
veredito            = nota final ≥ 4,5 ? DENTRO DO ESPERADO : ABAIXO DO ESPERADO
```

Só entra na base a avaliação **completa** (nota nos 4 critérios) — meia avaliação distorceria a média do dashboard.

### A escala de cada nota

Cada nota de cada critério tem uma descrição — é o que faz duas pessoas darem a mesma nota para o mesmo atendimento. Na ficha ela aparece de três formas: no *tooltip* de cada botão, em destaque logo abaixo (a da nota escolhida) e na lista completa pelo link **ver escala completa**. A descrição da nota dada também sai na imagem exportada, ao lado do critério.

**1. Entendeu o problema de fato** (peso 2)

| Nota | Significa |
|---|---|
| 0 | Não entendeu e não buscou entender. |
| 1 | Não entendeu e respondeu por suposição, sem perguntar nada ao cliente. |
| 2 | Não entendeu o problema do cliente, mas buscou entender. |
| 3 | Entendeu parcialmente o problema do cliente. |
| 4 | Entendeu parcialmente o problema do cliente e buscou entender a fundo. |
| 5 | Entendeu completamente o problema do cliente. |

**2. Resolveu de fato** (peso 3)

| Nota | Significa |
|---|---|
| 0 | Não conseguiu resolver. |
| 1 | Respondeu parcialmente as dúvidas do cliente e não garantiu que ele entendeu. |
| 2 | Respondeu parcialmente as dúvidas do cliente e garantiu que ele entendeu. |
| 3 | Respondeu o cliente, mas sem garantir que ele entendeu. |
| 4 | Resolveu o problema do cliente. |
| 5 | Resolveu o problema do cliente garantindo que ele entendeu. |

**3. Qualidade técnica da resposta** (peso 3)

| Nota | Significa |
|---|---|
| 0 | Respondeu de forma equivocada ao cliente. |
| 1 | Resposta abaixo do esperado na qualidade técnica: incompleta e sem clareza. |
| 2 | Resposta correta no geral, mas com informação faltando — o cliente teve que perguntar de novo. |
| 3 | Resposta sem profundidade técnica, porém correta e ajustada ao caso. |
| 4 | Resposta tecnicamente boa, que resolveu o problema do cliente garantindo que ele entendeu. |
| 5 | Resposta tecnicamente excelente, que resolveu o problema do cliente garantindo que ele entendeu. |

**4. Tom adequado, empático e no padrão Dionísio** (peso 2)

| Nota | Significa |
|---|---|
| 0 | Desrespeitou o cliente. |
| 1 | Respondeu de forma seca ou ríspida, sem nenhuma empatia. |
| 2 | Respondeu de forma desleixada. |
| 3 | Respondeu com alguns erros de digitação e pontuação e sem saudação inicial. |
| 4 | Respondeu com alguns erros de digitação e pontuação. |
| 5 | Respondeu de forma cordial e no padrão Dionísio. |

O bloco **TEMPO** (1ª resposta e duração) é informativo e não entra na média.

A **classificação do atendimento** (rotina, risco de churn, bug, cliente irritado, onboarding, financeiro) é só um rótulo para agrupar no dashboard — **não altera peso nem corte**.

Para mudar pesos, corte ou os textos da escala: `js/dados.js` → `PESOS`, `CORTE_MINIMO` e `GRUPOS_CRITERIOS` (campo `escala` de cada critério). Para incluir ou trocar alguém no time: `ATENDENTES`, no mesmo arquivo — ele alimenta o seletor de CS e a quebra por membro.

## Dashboard semanal

O recorte padrão é **esta semana** (segunda a domingo), porque é o ritmo da apresentação. Os botões de período são *Esta semana · Semana passada · Este mês · Tudo*, e o cabeçalho mostra o intervalo exato ("24/08/26 a 30/08/26").

Duas leituras na mesma tela:

- **Time completo** — nota média, % dentro do esperado, ranking por CS, média por critério, evolução semana a semana e as avaliações abaixo do corte.
- **Por membro** — um card por pessoa com a nota final da semana e a média em **cada critério**, para a conversa 1:1. O botão *Ver só ⟨nome⟩* filtra o dashboard inteiro naquela pessoa; o seletor "CS avaliado" faz o mesmo.

A **evolução semana a semana** ignora o filtro de período de propósito: ela existe para mostrar a série inteira.

### Exportar o relatório

No alto da tela, ao lado dos filtros: **⧉ Copiar relatório**, **↓ PNG** e **Pré-visualizar**. Sai **uma imagem só**, com o que estiver filtrado na tela (período e CS):

1. **Cabeçalho** — período, intervalo de datas, de quem é o recorte e a nota média num selo colorido
2. **Números do período** — avaliações, % dentro do esperado, quantas ficaram abaixo e o corte
3. **Ranking por CS** — barra por pessoa, verde ou vermelha conforme o corte, com nº de avaliações e % dentro
4. **Média por critério** — barra por critério, em roxo, com o peso de cada um
5. **Por membro do time** — um cartão por pessoa com a nota final e a média em cada critério
6. **Avaliações do período** — tabela com CS, cliente, atendimento, classificação, nota e veredito · **só no relatório individual**
7. **Rodapé** — a régua aplicada (pesos e corte)

No relatório do **time completo** a lista caso a caso não entra: ali o que interessa é o panorama. Ela aparece quando você filtra por uma pessoa, que é quando a conversa é sobre os atendimentos dela.

As barras do ranking usam verde/vermelho porque o corte vale para a nota final ponderada. As de critério isolado ficam roxas de propósito: um 4,3 em um critério não é reprovação — o corte só se aplica ao resultado final.

## A imagem (avaliação + conversa juntas)

Uma imagem só, feita para **copiar e colar**: a ficha da avaliação e os prints da conversa no mesmo PNG. Largura fixa de 2480 px e altura livre — cresce conforme o número de prints.

Anexe **um ou vários** screenshots da conversa — colando com **Ctrl+V**, arrastando os arquivos ou clicando na área. Cada print vira uma miniatura numerada, com botão de remover individual.

Depois:

- **⧉ Copiar imagem** — coloca o PNG inteiro na área de transferência; cole com Ctrl+V no Docs, no WhatsApp, no Slack ou no e-mail. Precisa de `localhost` ou `https`; em `file://` o navegador bloqueia e o app baixa o arquivo no lugar, avisando na hora.
- **↓ Baixar PNG** — salva como `avaliacao-victoria-padaria-aurora.png`.
- **Pré-visualizar** — abre a imagem numa aba nova.

A ordem dentro da imagem:

1. **Cabeçalho** — título e selo colorido com a nota final e o veredito
2. **Assunto** do atendimento em destaque
3. **Identificação** em duas colunas — CS avaliado, cliente/loja, canal, classificação, avaliador
4. **Critérios avaliados** — critério, o que observar **e a descrição da nota atribuída**, peso, nota e ponderado, com os grupos, a linha TEMPO (informativa) e TOTAIS
5. **Resultado** — nota final | corte mínimo | veredito, mais a memória de cálculo (`Σ ponderado ÷ 6 = nota`)
6. **Observações / feedback ao CS**
7. **Conversa avaliada** — os prints, numerados, em largura cheia
8. **Rodapé** — quem avaliou e a régua aplicada (pesos e corte)

Não entra data nem hora em lugar nenhum da imagem.

Tudo desenhado em canvas puro em `js/exportar.js` — sem biblioteca.

## Estrutura

```
index.html
apps_script.js          o banco de dados: código para colar no Apps Script da planilha
styles.css              tema escuro Dionísio (mesmas variáveis do produto)
js/
  dados.js              CS, PESOS/CORTE_MINIMO, critérios com escala 0–5 e classificações
  dados-demo.js         tickets e avaliações de teste antigos (NÃO carregado pelo app)
  estado.js             store (localStorage), períodos, cálculo da ponderada, agregações e anexos
  backup.js             baixar/restaurar tudo em um arquivo .json
  ui.js                 helpers de DOM, toast, formatação e tratamento de imagem
  graficos.js           gráficos em SVG puro (barras, linha, meter) + tooltip e "ver tabela"
  exportar.js           monta a imagem única (ficha + conversa) em canvas
  relatorio.js          monta a imagem do relatório do dashboard (usa Exportar.util)
  config.js             API_URL do banco de dados (o único campo a preencher)
  nuvem.js              sincroniza as avaliações com a planilha
  ficha.js              componentes compartilhados da ficha (critérios, totais, veredito, galeria de prints)
  tela-calculadora.js   Nova avaliação / editar uma avaliação salva
  tela-historico.js     avaliações registradas
  tela-dashboard.js     dashboard de qualidade (semanal + por membro)
  tela-tickets.js       fila de tickets (dormente: depende de TICKETS)
  tela-avaliacao.js     avaliar um ticket da fila (dormente)
  app.js                roteador por hash (#/dashboard, #/calculadora, #/calculadora/AV-003, #/historico)
```

## Como a avaliação é guardada

Cada avaliação é **autossuficiente**: ela carrega o CS, a loja, o canal, o assunto e a data do atendimento dentro dela mesma. Não depende de existir um ticket em lugar nenhum — é isso que faz tudo que você avalia aparecer no dashboard.

```js
{
  id: 'AV-001',
  cs: 'vitoria',                    // id de ATENDENTES — é o que agrupa por membro
  loja: 'Padaria Aurora',
  canal: 'WhatsApp',
  assunto: 'Impressora da cozinha parou de imprimir pedidos',
  contexto: 'bug',                  // classificação (só rótulo)
  primeiraRespostaMin: 5,
  duracaoMin: 47,
  notas: { entendeu: 5, resolveu: 5, precisao: 4, tom: 5 },   // Σ ponderado 28 ÷ 6 = 4,67
  observacoes: '…',
  avaliador: 'Murilo B.',
  avaliadoEm: '2026-08-24T13:00:00.000Z'   // eixo dos períodos do dashboard
}
```

O único carimbo de tempo é o `avaliadoEm`, gravado sozinho quando você salva: é ele que faz o recorte semanal do dashboard funcionar. Não existe campo de data do atendimento, e nenhuma data aparece na imagem.

## Banco de dados (a planilha do Google)

Sem banco configurado, cada navegador tem a sua base. Com o banco ligado, a mesma base aparece para todo mundo, em qualquer computador.

O banco é uma **planilha do Google** e a API é um **Apps Script** publicado em cima dela — o mesmo arranjo do funil. O passo a passo completo está no topo de `apps_script.js`; em resumo:

1. Crie a planilha, abra **Extensões → Apps Script** e cole o conteúdo de `apps_script.js`
2. **Implantar → Nova implantação → App da Web**, executando como você, acesso para *qualquer pessoa*
3. Copie a URL que termina em `/exec`
4. Cole em `js/config.js`, no campo `API_URL`, e publique

A aba `avaliacoes` nasce sozinha na primeira chamada, com uma coluna por campo.

### Como a sincronização se comporta

O navegador continua sendo a fonte **rápida**; a planilha é a fonte **compartilhada**.

- Ao abrir, a tela desenha na hora com o que está no navegador e busca o resto do time em segundo plano. Se vier novidade, a tela se atualiza e avisa.
- Ao salvar, grava local primeiro (instantâneo) e manda para a planilha depois.
- Sem internet ou com a planilha fora do ar, a avaliação **não se perde**: entra numa fila que sobe sozinha na próxima sincronização.
- Quando os dois lados têm a mesma avaliação, vence quem foi atualizado por último (`atualizadoEm`).
- Excluir não apaga a linha na planilha: marca como excluída, para o histórico continuar auditável.

No rodapé do menu há um indicador com o estado: *só neste navegador* (cinza), *sincronizando* (roxo), *banco sincronizado* (verde), *aguardando internet* (amarelo, com o número de pendências) ou *falha ao sincronizar* (vermelho). Clicar nele força uma sincronização.

### O que ainda não vai para o banco

Os **prints** continuam só no navegador. Uma célula de planilha não aguenta uma imagem inteira — para guardá-los seria preciso subir os arquivos para o Drive. As notas, os textos e todo o resto que alimenta o dashboard vão para a planilha normalmente.

## Persistência e backup

- Avaliações: `localStorage` → `dionisio_qualidade_cs_v2`
- Prints anexados: `localStorage` → `dionisio_qualidade_cs_prints_v1` (uma lista por avaliação, na chave do `id`)
- Rascunho da avaliação em andamento: `localStorage` → `dionisio_qualidade_cs_calc_v1`
- Backup em arquivo: `js/backup.js` (JSON com avaliações + prints)

São chaves separadas de propósito: uma imagem grande nunca derruba a gravação das notas. Os prints são reduzidos para no máximo 1400px de largura antes de serem guardados; se o navegador ficar sem espaço, o print continua valendo na sessão atual e o app avisa.

Enquanto você preenche, tudo fica no rascunho. Ao **salvar**, o registro entra na base e os prints passam do rascunho para a chave da avaliação — dá para reabrir meses depois e gerar as folhas A4 de novo, com os prints.

### O que sobrevive e o que não

O que você salva **sobrevive** a: trocar de tela, fechar a aba, fechar o navegador, reiniciar o PC.

O que **apaga** tudo:

- Abrir o app por outro endereço. O navegador guarda os dados por endereço: `http://localhost:4310` e o arquivo aberto por duplo clique (`file://…`) são duas caixas separadas. Abra sempre pelo mesmo caminho.
- Outro computador ou outro navegador (Chrome ≠ Edge).
- Limpar dados de navegação / usar janela anônima.

### Backup em arquivo

Na tela **Avaliações registradas**, no rodapé, existe a barra de backup. Ela mostra quantas avaliações e prints estão guardados, quanto ocupam e em qual endereço, e tem dois botões:

- **↓ Baixar backup** — gera `backup-avaliacoes-cs-2026-08-26.json` com **tudo**: avaliações e prints. Guarde no Drive.
- **↑ Restaurar backup** — lê esse arquivo de volta. Pergunta se você quer *substituir* tudo ou *juntar* (mantém o que já existe e acrescenta só o que falta, sem duplicar).

É o backup que leva as avaliações para outro computador, para outro navegador ou de volta depois de uma limpeza.

## Trocar por dados reais depois

Todo acesso a dados passa por `Estado` (`js/estado.js`). Para plugar backend, substitua ali:

- `Estado.avaliacoes()` → GET das avaliações
- `Estado.salvarAvaliacao(av)` → POST/PUT da avaliação
- `Estado.excluirAvaliacao(id)` → DELETE
- `Estado.tickets()` → GET dos tickets, se um dia a fila voltar
- `Anexos.lista/adicionar/removerEm` → upload/download dos prints

Nada mais no front conhece a origem dos dados.
