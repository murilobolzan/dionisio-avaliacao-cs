/* ============================================================
   apps_script.js — o banco de dados das avaliações

   Uma planilha do Google guarda as avaliações; este script publica
   uma API em cima dela. O site conversa com essa API, então a mesma
   base aparece para todo mundo, em qualquer computador.

   ─────────────────────────────────────────────────────────────
   SOBRE SEGURANÇA — leia antes de implantar
   ─────────────────────────────────────────────────────────────

   O site é uma página estática e pública. Isso significa que
   QUALQUER endereço que a página chame é visível para quem abrir a
   página. Por isso a proteção precisa estar aqui, no servidor.

   Como está resolvido:

   1. A implantação precisa ser "Qualquer pessoa" — é o único modo
      que o navegador consegue chamar (a implantação restrita ao
      domínio devolve a tela de login do Google e o navegador
      bloqueia por CORS).

   2. Em troca, TODA chamada exige um TOKEN. Sem token certo, a API
      não lê nem escreve nada. Quem descobrir a URL não consegue
      fazer nada com ela.

   3. O token NÃO fica no código do site nem neste arquivo. Ele
      mora em duas partes:
        · aqui: em Propriedades do Script (fora do código-fonte)
        · no site: cada pessoa cola uma vez, e fica só no navegador
                   dela

      Assim o repositório pode ser público sem expor o banco.

   4. Só o método POST lê ou grava dados. O GET responde apenas
      "API no ar", sem tocar na planilha — assim uma URL vazada não
      vira um vazamento de dados nem pelo navegador.

   ─────────────────────────────────────────────────────────────
   COMO COLOCAR NO AR (~4 minutos)
   ─────────────────────────────────────────────────────────────

   1. Crie uma planilha em sheets.new, nome "Avaliações CS · Dionísio".

   2. Menu Extensões → Apps Script. Apague tudo e cole este arquivo.

   3. Crie o token (a senha da API):
        Engrenagem (Configurações do projeto) → Propriedades do script
        → Adicionar propriedade
             Propriedade: TOKEN
             Valor:       uma frase longa e aleatória, só sua
        Salvar.

   4. Implantar → Nova implantação → App da Web
        Executar como:     Eu
        Quem tem acesso:   Qualquer pessoa      ← precisa ser este
      Implantar e autorizar (Avançado → Acessar projeto).

   5. Copie a URL que termina em /exec.

   6. No site: menu → Avaliações registradas → Banco de dados
      compartilhado. Cole a URL e o TOKEN e clique em Conectar.
      Cada pessoa do time faz isso uma vez, no navegador dela.

   A aba "avaliacoes" é criada sozinha na primeira chamada.

   ─────────────────────────────────────────────────────────────
   O QUE A API RESPONDE
   ─────────────────────────────────────────────────────────────

     GET   (sem token)              → { ok, mensagem } · só sinal de vida
     POST  { token, acao:'listar' } → { ok, avaliacoes: [...] }
     POST  { token, acao:'salvar',  avaliacao }
     POST  { token, acao:'excluir', id }

   Excluir não apaga a linha: marca como excluída, para o histórico
   da planilha continuar auditável.
   ============================================================ */

const ABA = 'avaliacoes';

/* A ordem aqui é a ordem das colunas na planilha. Para acrescentar um
   campo, adicione no fim desta lista — as linhas antigas continuam
   funcionando (vêm vazias). */
const COLUNAS = [
  'id',
  'cs',
  'loja',
  'canal',
  'assunto',
  'contexto',
  'primeiraRespostaMin',
  'duracaoMin',
  'notas',
  'observacoes',
  'avaliador',
  'avaliadoEm',
  'atualizadoEm',
  'excluido',
];

/* ---------------------------------------------------------------- */
/* segurança                                                         */
/* ---------------------------------------------------------------- */

/** O token vive nas Propriedades do Script, nunca no código. */
function tokenEsperado() {
  return PropertiesService.getScriptProperties().getProperty('TOKEN') || '';
}

/**
 * Confere o token. Falha fechada: sem TOKEN configurado, ninguém entra.
 * A comparação é feita de forma constante para não vazar o token pelo
 * tempo de resposta.
 */
function autorizado(recebido) {
  const esperado = tokenEsperado();
  if (!esperado) return false;
  const a = String(recebido || '');
  if (a.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < esperado.length; i++) {
    diff |= a.charCodeAt(i) ^ esperado.charCodeAt(i);
  }
  return diff === 0;
}

/* ---------------------------------------------------------------- */
/* planilha                                                          */
/* ---------------------------------------------------------------- */

function aba() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA);
  if (!sh) {
    sh = ss.insertSheet(ABA);
    sh.appendRow(COLUNAS);
    sh.setFrozenRows(1);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLUNAS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function paraObjeto(linha) {
  const av = {};
  COLUNAS.forEach((c, i) => {
    av[c] = linha[i];
  });

  /* notas viajam como texto JSON dentro da célula */
  try {
    av.notas = av.notas ? JSON.parse(av.notas) : {};
  } catch (e) {
    av.notas = {};
  }

  ['primeiraRespostaMin', 'duracaoMin'].forEach((k) => {
    av[k] = av[k] === '' || av[k] === null ? null : Number(av[k]);
  });

  av.excluido = av.excluido === true || String(av.excluido).toUpperCase() === 'TRUE';

  ['avaliadoEm', 'atualizadoEm'].forEach((k) => {
    if (av[k] instanceof Date) av[k] = av[k].toISOString();
    else av[k] = av[k] ? String(av[k]) : '';
  });

  return av;
}

function paraLinha(av) {
  return COLUNAS.map((c) => {
    if (c === 'notas') return JSON.stringify(av.notas || {});
    if (c === 'excluido') return av.excluido ? true : false;
    const v = av[c];
    return v === undefined || v === null ? '' : v;
  });
}

function listar() {
  const sh = aba();
  if (sh.getLastRow() < 2) return [];
  const valores = sh.getRange(2, 1, sh.getLastRow() - 1, COLUNAS.length).getValues();
  return valores.filter((l) => l[0]).map(paraObjeto);
}

/** Em qual linha está esse id (0 = não existe). */
function acharLinha(sh, id) {
  if (sh.getLastRow() < 2) return 0;
  const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return 0;
}

/* ---------------------------------------------------------------- */
/* ações                                                             */
/* ---------------------------------------------------------------- */

function salvar(av) {
  if (!av || !av.id) throw new Error('avaliação sem id');
  const trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    const sh = aba();
    av.atualizadoEm = new Date().toISOString();
    const linha = acharLinha(sh, av.id);
    if (linha) sh.getRange(linha, 1, 1, COLUNAS.length).setValues([paraLinha(av)]);
    else sh.appendRow(paraLinha(av));
    return av;
  } finally {
    trava.releaseLock();
  }
}

function excluir(id) {
  const trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    const sh = aba();
    const linha = acharLinha(sh, id);
    if (!linha) return { id: id, excluido: true };
    const atual = paraObjeto(sh.getRange(linha, 1, 1, COLUNAS.length).getValues()[0]);
    atual.excluido = true;
    atual.atualizadoEm = new Date().toISOString();
    sh.getRange(linha, 1, 1, COLUNAS.length).setValues([paraLinha(atual)]);
    return atual;
  } finally {
    trava.releaseLock();
  }
}

/* ---------------------------------------------------------------- */
/* entradas HTTP                                                     */
/* ---------------------------------------------------------------- */

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/** Sinal de vida. Não toca na planilha e não pede token de propósito. */
function doGet() {
  return responder({
    ok: true,
    mensagem: 'API de avaliações no ar. Os dados só respondem a POST com token.',
    tokenConfigurado: !!tokenEsperado(),
  });
}

function doPost(e) {
  try {
    /* o site manda text/plain de propósito: evita a requisição de
       verificação (preflight) que o Apps Script não responde */
    const corpo = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (!autorizado(corpo.token)) {
      return responder({
        ok: false,
        erro: tokenEsperado()
          ? 'token inválido'
          : 'TOKEN não configurado nas Propriedades do Script',
      });
    }

    if (corpo.acao === 'listar') {
      return responder({ ok: true, avaliacoes: listar() });
    }
    if (corpo.acao === 'salvar') {
      return responder({ ok: true, avaliacao: salvar(corpo.avaliacao) });
    }
    if (corpo.acao === 'excluir') {
      return responder({ ok: true, avaliacao: excluir(corpo.id) });
    }
    if (corpo.acao === 'salvarVarias') {
      return responder({ ok: true, avaliacoes: (corpo.avaliacoes || []).map(salvar) });
    }
    return responder({ ok: false, erro: 'ação desconhecida' });
  } catch (err) {
    return responder({ ok: false, erro: String(err) });
  }
}
