/* ============================================================
   tela-avaliacao.js — Conversa + formulário de avaliação (tela 2)

   Critérios e pesos FIXOS (iguais à planilha):
     Entendeu o problema real .................. 2
     Resolveu de fato .......................... 3
     Resposta correta e precisa ................ 3
     Tom adequado, empático, padrão Dionísio ... 2
     Proatividade .............................. 1   → Σ pesos = 11

   ponderado = nota(0–5) × peso · nota final = Σ ponderado ÷ Σ pesos
   veredito  = nota final ≥ 4,5 ? DENTRO : ABAIXO DO ESPERADO
   ============================================================ */

const TelaAvaliacao = (function () {
  let atual = null; /* { ticket, contexto, notas, observacoes, idExistente } */

  /* ---------------------------------------------------------------- */
  /* conversa                                                          */
  /* ---------------------------------------------------------------- */
  function bolha(m) {
    if (m.de === 'nota') {
      return `<div class="nota-interna">⚑ <strong>Nota interna do sistema</strong> · ${UI.esc(
        m.hora
      )}<br>${UI.escLinhas(m.texto)}</div>`;
    }
    const rotulo = m.de === 'cliente' ? `👤 ${m.autor}` : m.de === 'ia' ? '🤖 IA' : `🎧 ${m.autor}`;
    return `<div class="msg msg-${m.de}">
      <div class="bolha">
        <div class="bolha-autor">${UI.esc(rotulo)}</div>
        <div class="bolha-txt">${UI.escLinhas(m.texto)}</div>
        <div class="bolha-hora">${UI.esc(m.hora)}</div>
      </div>
    </div>`;
  }

  function conversaHTML(t) {
    const humanas = t.mensagens.filter((m) => m.de !== 'nota');
    const doAtendente = humanas.filter((m) => m.de === 'atendente').length;
    const daIA = humanas.filter((m) => m.de === 'ia').length;

    return `<div class="conversa-col">
      <div class="conversa-head">
        <span>${humanas.length} mensagens · ${doAtendente} do atendente · ${daIA} da IA · 1ª resposta em ${
      t.primeiraRespostaMin
    } min · duração ${UI.duracao(t.duracaoMin)}</span>
        <span>${UI.tagCanal(t.canal)}</span>
      </div>
      <div class="conversa-scroll">
        <div class="dia-sep">${UI.dataLonga(t.abertoEm)}</div>
        ${t.mensagens.map(bolha).join('')}
      </div>
    </div>`;
  }

  /* ---------------------------------------------------------------- */
  /* painel de avaliação                                               */
  /* ---------------------------------------------------------------- */

  function printHTML() {
    return Ficha.printsHTML(Anexos.lista(atual.ticket.id));
  }

  function painelHTML() {
    const { ticket, contexto, notas } = atual;
    const ctx = Calc.contexto(contexto);
    const res = Calc.calcular(notas, contexto);
    const at = Calc.atendente(ticket.atendente);

    return `<div class="aval-col">
      <div class="aval-col-scroll">

        <div class="ficha-topo">
          <div class="ficha-linha"><span>CS avaliado</span><span>${UI.esc(at.nome)}</span></div>
          <div class="ficha-linha"><span>Cliente / Loja</span><span>${UI.esc(ticket.loja)}</span></div>
          <div class="ficha-linha"><span>Data / Ticket</span><span class="ficha-auto">${UI.data(
            ticket.abertoEm,
            true
          )} · ${ticket.id}</span></div>
        </div>

        <label class="label-campo" for="selContexto">Classificação do atendimento
          <span style="color:var(--txt-3)">(só rótulo — não altera pesos)</span></label>
        <select class="select-contexto" id="selContexto">
          ${CONTEXTOS.map(
            (c) => `<option value="${c.id}"${c.id === contexto ? ' selected' : ''}>${UI.esc(c.nome)}</option>`
          ).join('')}
        </select>
        <div class="crit-obs" id="ctxDesc" style="margin:6px 2px 4px">${UI.esc(ctx.descricao)}</div>

        <div id="listaCriterios">
          ${GRUPOS_CRITERIOS.map(
            (g) => `<div class="grupo-crit">
              <div class="grupo-crit-head">${UI.esc(g.nome)}</div>
              ${g.criterios.map((c) => Ficha.critHTML(c, notas[c.id] ?? null)).join('')}
            </div>`
          ).join('')}

          <div class="grupo-crit">
            <div class="grupo-crit-head">Tempo</div>
            <div class="crit crit-info">
              <div class="crit-head">
                <div>
                  <div class="crit-nome">1ª resposta em ${ticket.primeiraRespostaMin} min</div>
                  <div class="crit-obs">Duração total do atendimento: ${UI.duracao(
                    ticket.duracaoMin
                  )}. Informativo — não entra na média.</div>
                </div>
                <span class="crit-peso crit-peso-off">sem peso</span>
              </div>
            </div>
          </div>
        </div>

        <div class="totais" id="boxTotais">${Ficha.totaisHTML(res)}</div>

        <div class="resultado" id="boxResultado">${Ficha.resultadoHTML(res)}</div>

        <label class="label-campo" for="txtObs">Observações / feedback ao CS</label>
        <textarea class="area" id="txtObs" placeholder="O que foi bem, o que repetir e o que ajustar no próximo atendimento…">${UI.esc(
          atual.observacoes
        )}</textarea>

        <label class="label-campo" style="margin-top:14px">Prints da conversa <span style="color:var(--txt-3)">(pode anexar vários)</span></label>
        <div id="printWrap">${printHTML()}</div>
        <input type="file" id="printInput" accept="image/*" multiple hidden />

        <div class="export-acoes">
          <button class="btn btn-primario btn-sm" id="btnCopiarImg">⧉ Copiar imagem</button>
          <button class="btn btn-sm" id="btnBaixarImg">↓ Baixar PNG</button>
          <button class="btn btn-sm btn-fantasma" id="btnAbrirImg">Pré-visualizar</button>
        </div>
        <div class="export-hint">A imagem sai com identificação, critérios, pesos, notas, ponderado, nota final, veredito, observações e o print anexado.</div>
      </div>

      <div class="aval-rodape">
        <span class="aviso ${res.completo ? 'aviso-ok' : ''}" id="avisoSalvar">${
      res.completo ? 'Pronto para registrar.' : 'Dê nota em todos os critérios para registrar.'
    }</span>
        ${atual.idExistente ? `<button class="btn btn-sm btn-perigo" id="btnExcluir">Excluir</button>` : ''}
        <button class="btn btn-primario" id="btnSalvar"${res.completo ? '' : ' disabled'}>${
      atual.idExistente ? 'Atualizar avaliação' : 'Registrar avaliação'
    }</button>
      </div>
    </div>`;
  }

  /* ---------------------------------------------------------------- */
  /* atualização incremental (não re-renderiza a tela toda)            */
  /* ---------------------------------------------------------------- */
  function atualizarCalculos(root) {
    const res = Ficha.atualizar(root, atual.notas, atual.contexto);

    const aviso = UI.q('#avisoSalvar', root);
    aviso.textContent = res.completo
      ? 'Pronto para registrar.'
      : `Dê nota em todos os critérios para registrar (${res.preenchidos}/${res.totalCriterios}).`;
    aviso.classList.toggle('aviso-ok', res.completo);
    UI.q('#btnSalvar', root).disabled = !res.completo;
  }

  /* ---------------------------------------------------------------- */
  /* print: anexar / remover                                           */
  /* ---------------------------------------------------------------- */
  function redesenharPrint(root) {
    UI.q('#printWrap', root).innerHTML = printHTML();
  }

  async function anexarArquivos(root, arquivos) {
    const lista = [...arquivos].filter((f) => f && /^image\//.test(f.type));
    if (!lista.length) {
      UI.toast('Anexe arquivos de imagem (print da conversa).', true);
      return;
    }
    let persistiuTudo = true;
    for (const f of lista) {
      try {
        const reduzido = await Ficha.lerPrint(f);
        if (!Anexos.adicionar(atual.ticket.id, reduzido)) persistiuTudo = false;
      } catch (err) {
        console.error(err);
        UI.toast('Não foi possível ler uma das imagens.', true);
      }
    }
    redesenharPrint(root);
    const total = Anexos.quantos(atual.ticket.id);
    UI.toast(
      persistiuTudo
        ? `${lista.length > 1 ? lista.length + " prints anexados" : "Print anexado"} · ${total} no total.`
        : 'Print anexado só nesta sessão (navegador sem espaço para guardar).'
    );
  }
  function dadosExport() {
    return {
      ticket: atual.ticket,
      contexto: atual.contexto,
      res: Calc.calcular(atual.notas, atual.contexto),
      observacoes: atual.observacoes.trim(),
      avaliador: 'Murilo B.',
      prints: Anexos.lista(atual.ticket.id),
    };
  }

  /* ---------------------------------------------------------------- */
  /* montagem                                                          */
  /* ---------------------------------------------------------------- */
  function montar(root, ticketId) {
    const ticket = Estado.ticket(ticketId);
    if (!ticket) {
      root.innerHTML = `<div class="pagina"><div class="vazio">Ticket ${UI.esc(
        ticketId
      )} não encontrado. <button class="btn btn-sm" onclick="App.ir('tickets')">Voltar para a fila</button></div></div>`;
      return;
    }

    const av = Estado.avaliacaoDoTicket(ticketId);
    atual = {
      ticket,
      contexto: av ? av.contexto : ticket.contextoSugerido,
      notas: av ? { ...av.notas } : {},
      observacoes: av ? av.observacoes : '',
      idExistente: av ? av.id : null,
    };

    const res0 = Calc.calcular(atual.notas, atual.contexto);
    const pendentes = Estado.tickets().filter((t) => !Estado.avaliacaoDoTicket(t.id) && t.id !== ticketId);

    root.innerHTML = `<div class="pagina pagina-full"><div class="aval-wrap">
      <div class="aval-top">
        <button class="btn btn-sm btn-fantasma" id="btnVoltar">← Fila</button>
        <div class="aval-top-info">
          <div class="aval-top-titulo">
            <span class="ticket-id mono">${ticket.id}</span>
            <h2>${UI.esc(ticket.assunto)}</h2>
            ${UI.tagStatus(av ? res0 : null)}
          </div>
          <div class="aval-top-sub">${UI.esc(ticket.loja)} · ${UI.esc(ticket.contato)} · atendido por ${UI.esc(
      Calc.atendente(ticket.atendente).nome
    )} · aberto ${UI.data(ticket.abertoEm, true)}</div>
        </div>
        ${pendentes.length ? `<button class="btn btn-sm" id="btnProximo">Próximo pendente →</button>` : ''}
      </div>
      <div class="aval-corpo">
        ${conversaHTML(ticket)}
        ${painelHTML()}
      </div>
    </div></div>`;

    /* ---- navegação ---- */
    UI.q('#btnVoltar', root).addEventListener('click', () => App.ir('tickets'));
    const btnProx = UI.q('#btnProximo', root);
    if (btnProx) btnProx.addEventListener('click', () => App.ir('avaliar/' + pendentes[0].id));

    /* ---- classificação ---- */
    UI.q('#selContexto', root).addEventListener('change', (e) => {
      atual.contexto = e.target.value;
      UI.q('#ctxDesc', root).textContent = Calc.contexto(atual.contexto).descricao;
    });

    /* ---- notas ---- */
    UI.on(root, 'click', '[data-nota]', (ev, btn) => {
      Ficha.alternarNota(atual.notas, btn.dataset.para, Number(btn.dataset.nota));
      atualizarCalculos(root);
    });

    UI.q('#txtObs', root).addEventListener('input', (e) => {
      atual.observacoes = e.target.value;
    });

    /* ---- print: clique, arquivo, arraste e Ctrl+V ---- */
    const input = UI.q('#printInput', root);
    input.addEventListener('change', (e) => {
      const arquivos = [...(e.target.files || [])];
      e.target.value = '';
      if (arquivos.length) anexarArquivos(root, arquivos);
    });

    UI.on(root, 'click', '[data-print]', (ev, el) => {
      if (el.dataset.print === 'remover') {
        Anexos.removerEm(atual.ticket.id, Number(el.dataset.indice));
        redesenharPrint(root);
        UI.toast('Print removido.');
        return;
      }
      input.click();
    });

    Ficha.ligarArraste(UI.q('#printWrap', root), (arquivos) => anexarArquivos(root, arquivos));

    /* colar print direto da área de transferência (registro único no document) */
    UI.onGlobal('paste', 'print-avaliacao', (e) => {
      if (!location.hash.includes('avaliar') || !atual) return;
      const arquivos = Ficha.imagensDoPaste(e);
      if (arquivos.length) {
        e.preventDefault();
        anexarArquivos(document.getElementById('conteudo'), arquivos);
      }
    });
    /* ---- exportar imagem ---- */
    UI.q('#btnCopiarImg', root).addEventListener('click', async (ev) => {
      const b = ev.currentTarget;
      b.disabled = true;
      const antes = b.textContent;
      b.textContent = 'Gerando…';
      try {
        await Exportar.copiar(dadosExport());
        UI.toast('Imagem copiada — cole no WhatsApp, Slack ou e-mail (Ctrl+V).');
      } catch (err) {
        console.warn(err);
        await Exportar.baixar(dadosExport());
        UI.toast('Seu navegador não deixou copiar; baixei o PNG no lugar.', true);
      } finally {
        b.disabled = false;
        b.textContent = antes;
      }
    });

    UI.q('#btnBaixarImg', root).addEventListener('click', async () => {
      await Exportar.baixar(dadosExport());
      UI.toast('PNG baixado.');
    });

    UI.q('#btnAbrirImg', root).addEventListener('click', async () => {
      await Exportar.abrir(dadosExport());
    });

    /* ---- salvar / excluir ---- */
    UI.q('#btnSalvar', root).addEventListener('click', () => {
      const res = Calc.calcular(atual.notas, atual.contexto);
      if (!res.completo) return;
      Estado.salvarAvaliacao({
        ticketId: atual.ticket.id,
        /* copiados do ticket para a avaliação não depender dele depois */
        cs: atual.ticket.atendente,
        loja: atual.ticket.loja,
        canal: atual.ticket.canal,
        assunto: atual.ticket.assunto,
        quando: atual.ticket.abertoEm,
        primeiraRespostaMin: atual.ticket.primeiraRespostaMin,
        duracaoMin: atual.ticket.duracaoMin,
        contexto: atual.contexto,
        notas: { ...atual.notas },
        observacoes: atual.observacoes.trim(),
        avaliador: 'Murilo B.',
        avaliadoEm: new Date().toISOString(),
      });
      App.atualizarBadge();
      UI.toast(
        `Avaliação registrada: ${UI.num(res.notaFinal, 2)} — ${
          res.aprovado ? 'dentro do esperado' : 'abaixo do esperado'
        }.`
      );
      const proximo = Estado.tickets().find((t) => !Estado.avaliacaoDoTicket(t.id));
      App.ir(proximo ? 'avaliar/' + proximo.id : 'tickets');
    });

    const btnEx = UI.q('#btnExcluir', root);
    if (btnEx)
      btnEx.addEventListener('click', () => {
        if (!confirm('Excluir a avaliação deste ticket?')) return;
        Estado.excluirAvaliacao(atual.idExistente);
        App.atualizarBadge();
        UI.toast('Avaliação excluída.');
        montar(root, ticketId);
      });
  }

  return { montar };
})();
