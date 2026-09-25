/* ============================================================
   dados.js — dados fictícios de demonstração
   Atendentes, contextos (pesos), critérios e tickets/conversas.
   ============================================================ */

const ATENDENTES = [
  { id: 'murilo', nome: 'Murilo', iniciais: 'MU' },
  { id: 'vitoria', nome: 'Victoria', iniciais: 'VI' },
  { id: 'ryan', nome: 'Ryan', iniciais: 'RY' },
  { id: 'pedro', nome: 'Pedro', iniciais: 'PE' },
];

/* --- Pesos e corte: FIXOS (iguais à planilha de avaliação) --------------- */
const PESOS = { entendeu: 1, resolveu: 2, precisao: 2, tom: 1 }; /* Σ = 6 */
const CORTE_MINIMO = 4.5;

/* --- Classificação do atendimento (só rótulo: NÃO altera pesos nem corte) - */
const CONTEXTOS = [
  { id: 'rotina', nome: 'Rotina / dúvida simples', descricao: 'Cliente saudável, dúvida de uso do dia a dia.' },
  { id: 'churn', nome: 'Saúde ruim / risco de churn', descricao: 'Cliente com engajamento caindo ou já falando em cancelar.' },
  { id: 'bug', nome: 'Bug / incidente técnico', descricao: 'Algo quebrado no produto; exige investigação antes de responder.' },
  { id: 'irritado', nome: 'Cliente irritado / reclamação', descricao: 'Cliente já chegou insatisfeito; condução do tom é crítica.' },
  { id: 'onboarding', nome: 'Onboarding / cliente novo', descricao: 'Primeiros 30 dias; ensinar bem vale tanto quanto resolver.' },
  { id: 'financeiro', nome: 'Financeiro / cobrança', descricao: 'Fatura, plano, upgrade e cancelamento.' },
];

/* --- Critérios, pesos e a escala de cada nota (0 a 5) -------------------- */
/* A escala é o que aparece no título de cada nota, no painel da ficha e na    */
/* imagem exportada — é ela que faz duas pessoas darem a mesma nota.           */
/*                                                                            */
/* São quatro critérios numa lista só. O campo `nome` do grupo fica vazio de   */
/* propósito: sem subtítulo, porque a régua não tem mais subdivisões.          */

const GRUPOS_CRITERIOS = [
  {
    id: 'regua',
    nome: '',
    criterios: [
      {
        id: 'entendeu',
        nome: 'Compreensão do problema',
        curto: 'Compreensão',
        observar:
          'Identificou corretamente a necessidade do cliente antes de orientar ou agir.',
        escala: {
          0: 'Não compreendeu o problema e não tentou investigá-lo.',
          1: 'Interpretou incorretamente e respondeu com base em uma suposição.',
          2: 'Não compreendeu inicialmente, mas fez perguntas para tentar identificar o problema.',
          3: 'Compreendeu o problema principal, mas deixou pontos relevantes sem investigar.',
          4: 'Compreendeu o problema e investigou os principais pontos necessários para solucioná-lo.',
          5: 'Compreendeu completamente o contexto, identificou a causa ou necessidade real e, quando necessário, investigou além da dúvida inicial.',
        },
      },
      {
        id: 'resolveu',
        nome: 'Resolução e eficácia',
        curto: 'Resolução',
        observar:
          'Resolveu a necessidade do cliente e conduziu o atendimento até uma conclusão adequada.',
        escala: {
          0: 'Não resolveu e não apresentou um caminho para solução.',
          1: 'Deu uma orientação insuficiente ou apenas parcial, sem direcionar os próximos passos.',
          2: 'Resolveu apenas parte da necessidade, deixando pendências relevantes.',
          3: 'Apresentou uma solução adequada, mas não confirmou se o cliente conseguiu aplicar ou se a necessidade foi resolvida.',
          4: 'Resolveu a necessidade do cliente e orientou corretamente os próximos passos.',
          5: 'Resolveu a necessidade de forma completa, confirmou o resultado ou entendimento do cliente e, quando necessário, antecipou possíveis dúvidas ou próximos passos.',
        },
      },
      {
        id: 'precisao',
        nome: 'Qualidade técnica e precisão',
        curto: 'Qualidade técnica',
        observar: 'A resposta foi correta, clara, completa e tecnicamente adequada ao caso.',
        escala: {
          0: 'Informação incorreta ou orientação que pode gerar um problema para o cliente.',
          1: 'Resposta predominantemente incorreta, superficial ou sem fundamento.',
          2: 'Resposta parcialmente correta, mas com informações importantes faltando ou orientação pouco clara.',
          3: 'Resposta correta, porém incompleta ou sem o nível de detalhamento necessário, fazendo o cliente precisar perguntar novamente.',
          4: 'Resposta correta, clara e adequada ao caso, com as informações necessárias para o cliente prosseguir.',
          5: 'Resposta tecnicamente completa e precisa, utilizando o melhor recurso disponível para facilitar o entendimento, como passo a passo, exemplos, prints, vídeos ou outras orientações pertinentes.',
        },
      },
      {
        id: 'tom',
        nome: 'Comunicação e experiência do cliente',
        curto: 'Comunicação',
        observar:
          'Clareza, cordialidade, segurança e padrão de comunicação Dionísio na condução do atendimento.',
        escala: {
          0: 'Comunicação desrespeitosa, inadequada ou que prejudica claramente a experiência do cliente.',
          1: 'Comunicação seca, ríspida ou pouco profissional.',
          2: 'Comunicação pouco cuidadosa, confusa ou excessivamente informal.',
          3: 'Comunicação adequada, mas com problemas perceptíveis de clareza, organização, escrita ou condução.',
          4: 'Comunicação clara, cordial, profissional e adequada ao contexto.',
          5: 'Comunicação clara, cordial, segura e humanizada, com postura consultiva e proativa, transmitindo domínio do assunto e deixando o cliente seguro sobre a solução.',
        },
      },
    ],
  },
];

/** Lista achatada de critérios, na ordem de exibição. */
const CRITERIOS = GRUPOS_CRITERIOS.flatMap((g) => g.criterios);


/* ============================================================
   TICKETS — fila de atendimentos a auditar

   Vazio de propósito: as avaliações agora nascem na tela
   "Nova avaliação", digitadas à mão. Esta lista existe para o dia
   em que os tickets vierem de uma API (Estado.tickets() em
   js/estado.js é o único ponto que precisa mudar).

   Os 14 tickets de teste antigos estão em js/dados-demo.js.
   ============================================================ */

const TICKETS = [];


/* Avaliações de demonstração: nenhuma. A base começa limpa e só
   guarda o que você avaliar. */
const AVALIACOES_DEMO = [];
