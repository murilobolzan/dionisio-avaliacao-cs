/* ============================================================
   dados.js — dados fictícios de demonstração
   Atendentes, contextos (pesos), critérios e tickets/conversas.
   ============================================================ */

const ATENDENTES = [
  { id: 'murilo', nome: 'Murilo', iniciais: 'MU' },
  { id: 'vitoria', nome: 'Victoria', iniciais: 'VI' },
  { id: 'ryan', nome: 'Ryan', iniciais: 'RY' },
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

const GRUPOS_CRITERIOS = [
  {
    id: 'resolucao',
    nome: 'Resolução & Eficácia',
    criterios: [
      {
        id: 'entendeu',
        nome: 'Entendeu o problema de fato',
        curto: 'Entendeu o problema',
        observar: 'Investigou antes de responder; não presumiu.',
        escala: {
          0: 'Não entendeu e não buscou entender.',
          1: 'Não entendeu e respondeu por suposição, sem perguntar nada ao cliente.',
          2: 'Não entendeu o problema do cliente, mas buscou entender.',
          3: 'Entendeu parcialmente o problema do cliente.',
          4: 'Entendeu parcialmente o problema do cliente e buscou entender a fundo.',
          5: 'Entendeu completamente o problema do cliente.',
        },
      },
      {
        id: 'resolveu',
        nome: 'Resolveu de fato',
        curto: 'Resolveu de fato',
        observar: 'Resolveu e confirmou o entendimento; não empurrou nem fechou prematuro.',
        escala: {
          0: 'Não conseguiu resolver.',
          1: 'Respondeu parcialmente as dúvidas do cliente e não garantiu que ele entendeu.',
          2: 'Respondeu parcialmente as dúvidas do cliente e garantiu que ele entendeu.',
          3: 'Respondeu o cliente, mas sem garantir que ele entendeu.',
          4: 'Resolveu o problema do cliente.',
          5: 'Resolveu o problema do cliente garantindo que ele entendeu.',
        },
      },
    ],
  },
  {
    id: 'tecnica',
    nome: 'Qualidade técnica',
    criterios: [
      {
        id: 'precisao',
        nome: 'Qualidade técnica da resposta',
        curto: 'Qualidade técnica',
        observar: 'Sem informação errada ou incompleta; profundidade técnica adequada.',
        escala: {
          0: 'Respondeu de forma equivocada ao cliente.',
          1: 'Resposta abaixo do esperado na qualidade técnica: incompleta e sem clareza.',
          2: 'Resposta correta no geral, mas com informação faltando — o cliente teve que perguntar de novo.',
          3: 'Resposta sem profundidade técnica, porém correta e ajustada ao caso.',
          4: 'Resposta tecnicamente boa, que resolveu o problema do cliente garantindo que ele entendeu.',
          5: 'Resposta tecnicamente excelente, que resolveu o problema do cliente garantindo que ele entendeu.',
        },
      },
    ],
  },
  {
    id: 'relacionamento',
    nome: 'Relacionamento & Comunicação',
    criterios: [
      {
        id: 'tom',
        nome: 'Tom adequado, empático e no padrão Dionísio',
        curto: 'Tom e cordialidade',
        observar: 'Cordial, humano, escrita cuidada e alinhado à marca.',
        escala: {
          0: 'Desrespeitou o cliente.',
          1: 'Respondeu de forma seca ou ríspida, sem nenhuma empatia.',
          2: 'Respondeu de forma desleixada.',
          3: 'Respondeu com alguns erros de digitação e pontuação e sem saudação inicial.',
          4: 'Respondeu com alguns erros de digitação e pontuação.',
          5: 'Respondeu de forma cordial e no padrão Dionísio.',
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
