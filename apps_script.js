/* ============================================================
   apps_script.js — o banco de dados das avaliações

   Uma planilha do Google guarda as avaliações; este script publica
   uma API em cima dela. O site (GitHub/Vercel) conversa com essa API,
   então a mesma base aparece para todo mundo, em qualquer computador.

   ─────────────────────────────────────────────────────────────
   COMO COLOCAR NO AR (uma vez, ~3 minutos)
   ─────────────────────────────────────────────────────────────

   1. Crie uma planilha nova em sheets.new e dê o nome
      "Avaliações CS · Dionísio".

   2. Nessa planilha: menu Extensões → Apps Script.

   3. Apague o conteúdo do editor, cole ESTE arquivo inteiro e salve
      (ícone de disquete).

   4. Clique em Implantar → Nova implantação.
        Tipo:              App da Web
        Executar como:     Eu
        Quem tem acesso:   Qualquer pessoa
      Clique em Implantar e autorize (vai aparecer aviso de app não
      verificado: Avançado → Acessar projeto).

   5. Copie a URL que termina em /exec.

   6. Cole essa URL em js/config.js do site, no campo API_URL.

   A aba "avaliacoes" é criada sozinha na primeira chamada.

   ─────────────────────────────────────────────────────────────
   O QUE A API RESPONDE
   ─────────────────────────────────────────────────────────────

     GET  ?acao=listar            → { ok, avaliacoes: [...] }
     POST { acao:'salvar', avaliacao }
     POST { acao:'excluir', id }

   Nada é apagado de verdade: excluir marca a linha como excluída,
   para o histórico da planilha continuar auditável.
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

  /* datas podem voltar como Date, dependendo de como a célula ficou */
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

function doGet(e) {
  try {
    const acao = (e && e.parameter && e.parameter.acao) || 'listar';
    if (acao === 'listar') return responder({ ok: true, avaliacoes: listar() });
    return responder({ ok: false, erro: 'ação desconhecida: ' + acao });
  } catch (err) {
    return responder({ ok: false, erro: String(err) });
  }
}

function doPost(e) {
  try {
    /* o site manda text/plain de propósito: evita a requisição de
       verificação (preflight) que o Apps Script não responde */
    const corpo = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (corpo.acao === 'salvar') {
      return responder({ ok: true, avaliacao: salvar(corpo.avaliacao) });
    }
    if (corpo.acao === 'excluir') {
      return responder({ ok: true, avaliacao: excluir(corpo.id) });
    }
    if (corpo.acao === 'salvarVarias') {
      const salvas = (corpo.avaliacoes || []).map(salvar);
      return responder({ ok: true, avaliacoes: salvas });
    }
    return responder({ ok: false, erro: 'ação desconhecida' });
  } catch (err) {
    return responder({ ok: false, erro: String(err) });
  }
}
