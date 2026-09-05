/* ============================================================
   nuvem.js — sincroniza as avaliações com o banco (planilha)

   Como funciona, em uma frase: o navegador continua sendo a fonte
   rápida, e a planilha é a fonte compartilhada.

     · Ao abrir, a tela desenha na hora com o que está no navegador
       e busca o resto do time em segundo plano.
     · Ao salvar, grava local primeiro (instantâneo) e manda para a
       planilha depois. Se a internet cair, fica numa fila e sobe
       sozinho na próxima vez.
     · Quando os dois lados divergem, vence quem foi atualizado por
       último (campo atualizadoEm).

   Sem API_URL configurada em js/config.js, tudo isso fica desligado
   e o app funciona exatamente como antes, só no navegador.
   ============================================================ */

const Nuvem = (function () {
  const CHAVE_FILA = 'dionisio_qualidade_cs_fila_v1';
  const CHAVE_BANCO = 'dionisio_qualidade_cs_banco_v1';

  let ligada = false;
  let estado = 'desligada'; /* desligada | sincronizando | ok | erro | fila */
  let ultimoErro = '';
  let aoMudar = null; /* callback para a tela se redesenhar */

  /* ---------------------------------------------------------------- */
  /* fila de envios pendentes (sobrevive a fechar a aba)               */
  /* ---------------------------------------------------------------- */

  function lerFila() {
    try {
      const raw = localStorage.getItem(CHAVE_FILA);
      const l = raw ? JSON.parse(raw) : [];
      return Array.isArray(l) ? l : [];
    } catch (e) {
      return [];
    }
  }

  function gravarFila(l) {
    try {
      localStorage.setItem(CHAVE_FILA, JSON.stringify(l));
    } catch (e) {
      /* fila é conveniência: sem espaço, seguimos sem ela */
    }
  }

  function enfileirar(item) {
    const fila = lerFila().filter(
      (x) => !(x.acao === item.acao && x.id === item.id) /* um por id/ação */
    );
    fila.push(item);
    gravarFila(fila);
  }

  /* ---------------------------------------------------------------- */
  /* conversa com o Apps Script                                        */
  /* ---------------------------------------------------------------- */

  /**
   * Endereço e token do banco.
   *
   * Ficam no navegador de cada pessoa, NÃO no código: o site é público,
   * então qualquer segredo commitado estaria à vista de todos.
   */
  function credenciais() {
    try {
      const raw = localStorage.getItem(CHAVE_BANCO);
      if (raw) {
        const c = JSON.parse(raw);
        if (c && c.url) return { url: c.url, token: c.token || '' };
      }
    } catch (e) {
      /* sem acesso ao storage: segue sem banco */
    }
    /* plano B: js/config.js — só use se o repositório for privado */
    const doArquivo = (typeof CONFIG !== 'undefined' && CONFIG.API_URL) || '';
    return doArquivo ? { url: doArquivo, token: (CONFIG && CONFIG.TOKEN) || '' } : { url: '', token: '' };
  }

  function url() {
    return credenciais().url;
  }

  /**
   * Toda leitura e escrita é POST com token no corpo.
   * O token nunca vai na URL (não fica em histórico nem em log de acesso).
   *
   * text/plain de propósito: com application/json o navegador manda uma
   * verificação prévia (preflight) que o Apps Script não responde.
   */
  async function chamar(corpo) {
    const c = credenciais();
    if (!c.url) throw new Error('banco não configurado');
    const r = await fetch(c.url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...corpo, token: c.token }),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const resp = await r.json();
    if (resp && resp.ok === false) throw new Error(resp.erro || 'recusado pelo banco');
    return resp;
  }

  /* ---------------------------------------------------------------- */
  /* estado visível                                                    */
  /* ---------------------------------------------------------------- */

  function marcar(novo, erro) {
    estado = novo;
    ultimoErro = erro || '';
    if (aoMudar) aoMudar(situacao());
  }

  function situacao() {
    const pend = lerFila().length;
    return {
      ligada,
      estado: !ligada ? 'desligada' : pend && estado !== 'sincronizando' ? 'fila' : estado,
      pendentes: pend,
      erro: ultimoErro,
    };
  }

  /* ---------------------------------------------------------------- */
  /* junção: o que vale quando os dois lados têm a mesma avaliação     */
  /* ---------------------------------------------------------------- */

  function maisNovo(a, b) {
    const ta = new Date(a.atualizadoEm || a.avaliadoEm || 0).getTime();
    const tb = new Date(b.atualizadoEm || b.avaliadoEm || 0).getTime();
    return tb > ta ? b : a;
  }

  /**
   * Junta o que veio da planilha com o que está no navegador.
   * Devolve true se algo mudou por aqui (aí a tela se redesenha).
   */
  function juntar(remotas) {
    const locais = Estado.avaliacoes();
    const mapa = new Map();

    locais.forEach((a) => mapa.set(a.id, a));

    let mudou = false;
    remotas.forEach((r) => {
      const local = mapa.get(r.id);

      if (r.excluido) {
        if (local) {
          mapa.delete(r.id);
          Anexos.limparDe(r.id);
          mudou = true;
        }
        return;
      }
      if (!local) {
        mapa.set(r.id, r);
        mudou = true;
        return;
      }
      const vencedor = maisNovo(local, r);
      if (vencedor === r) {
        mapa.set(r.id, r);
        mudou = true;
      }
    });

    if (mudou) Estado.substituirTudo([...mapa.values()]);
    return mudou;
  }

  /* ---------------------------------------------------------------- */
  /* operações                                                         */
  /* ---------------------------------------------------------------- */

  /** Sobe o que está na fila. Devolve quantos subiram. */
  async function esvaziarFila() {
    const fila = lerFila();
    if (!fila.length) return 0;

    const restantes = [];
    let enviados = 0;

    for (const item of fila) {
      try {
        if (item.acao === 'salvar') {
          const av = Estado.avaliacao(item.id);
          if (!av) continue; /* foi excluída depois: nada a enviar */
          await chamar({ acao: 'salvar', avaliacao: av });
        } else if (item.acao === 'excluir') {
          await chamar({ acao: 'excluir', id: item.id });
        }
        enviados++;
      } catch (err) {
        restantes.push(item); /* tenta de novo na próxima */
      }
    }

    gravarFila(restantes);
    return enviados;
  }

  /** Puxa a planilha e junta com o local. */
  async function baixar() {
    const resp = await chamar({ acao: 'listar' });
    return juntar(resp.avaliacoes || []);
  }

  /** Ciclo completo: sobe pendências e baixa o que há de novo. */
  async function sincronizar() {
    if (!ligada) return { ok: false, motivo: 'desligada' };
    marcar('sincronizando');
    try {
      await esvaziarFila();
      const mudou = await baixar();
      marcar('ok');
      return { ok: true, mudou };
    } catch (err) {
      marcar('erro', String(err.message || err));
      return { ok: false, erro: String(err.message || err) };
    }
  }

  /* ---------------------------------------------------------------- */
  /* API usada pelo resto do app                                       */
  /* ---------------------------------------------------------------- */

  return {
    /**
     * @param {Function} quandoMudar chamado quando a situação muda ou
     *                               quando chegam dados novos da planilha
     */
    iniciar(quandoMudar) {
      aoMudar = quandoMudar || null;
      ligada = !!url();
      if (!ligada) {
        marcar('desligada');
        return;
      }
      marcar('sincronizando');
      sincronizar().then((r) => {
        if (r.mudou && aoMudar) aoMudar(situacao(), true);
      });

      /* volta a tentar quando a internet voltar */
      window.addEventListener('online', () => sincronizar());
    },

    /** Chamado depois de salvar uma avaliação. */
    enviar(av) {
      if (!ligada || !av || !av.id) return;
      enfileirar({ acao: 'salvar', id: av.id });
      marcar('sincronizando');
      chamar({ acao: 'salvar', avaliacao: av })
        .then((r) => {
          if (r && r.ok) {
            gravarFila(lerFila().filter((x) => !(x.acao === 'salvar' && x.id === av.id)));
            marcar('ok');
          } else {
            marcar('erro', (r && r.erro) || 'falha ao salvar');
          }
        })
        .catch((err) => marcar('erro', String(err.message || err)));
    },

    /** Chamado depois de excluir uma avaliação. */
    excluir(id) {
      if (!ligada || !id) return;
      enfileirar({ acao: 'excluir', id });
      marcar('sincronizando');
      chamar({ acao: 'excluir', id })
        .then((r) => {
          if (r && r.ok) {
            gravarFila(lerFila().filter((x) => !(x.acao === 'excluir' && x.id === id)));
            marcar('ok');
          } else {
            marcar('erro', (r && r.erro) || 'falha ao excluir');
          }
        })
        .catch((err) => marcar('erro', String(err.message || err)));
    },

    sincronizar,
    situacao,
    configurada: () => !!url(),

    /** O que está guardado (o token volta mascarado, para exibir na tela). */
    credenciais() {
      const c = credenciais();
      return {
        url: c.url,
        temToken: !!c.token,
        tokenMascarado: c.token ? c.token.slice(0, 3) + '•••••' + c.token.slice(-2) : '',
      };
    },

    /** Guarda endereço e token NESTE navegador e liga a sincronização. */
    async conectar(endereco, token) {
      const limpo = String(endereco || '').trim();
      if (!/^https:\/\/script\.google\.com\/.*\/exec$/.test(limpo)) {
        throw new Error('Endereço estranho: precisa ser a URL do Apps Script terminando em /exec.');
      }
      if (/\/a\/macros\//.test(limpo)) {
        throw new Error(
          'Essa implantação está restrita ao domínio e o navegador bloqueia. Reimplante com acesso "Qualquer pessoa".'
        );
      }
      if (!String(token || '').trim()) throw new Error('Informe o token do banco.');

      localStorage.setItem(
        CHAVE_BANCO,
        JSON.stringify({ url: limpo, token: String(token).trim() })
      );
      ligada = true;

      /* prova que funciona antes de dar certo na cara do usuário */
      try {
        await chamar({ acao: 'listar' });
      } catch (err) {
        localStorage.removeItem(CHAVE_BANCO);
        ligada = false;
        marcar('desligada');
        throw err;
      }
      return sincronizar();
    },

    /** Esquece o banco neste navegador (os dados locais continuam). */
    desconectar() {
      localStorage.removeItem(CHAVE_BANCO);
      ligada = false;
      marcar('desligada');
    },
  };
})();
