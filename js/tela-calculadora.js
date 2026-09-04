/* ============================================================
   tela-calculadora.js — Nova avaliação (e edição de uma salva)

   É por aqui que toda avaliação nasce: você digita os dados do
   atendimento, dá as notas (0 a 5), anexa os prints da conversa,
   SALVA (vai para o dashboard e para o histórico) e gera a imagem
   em folhas A4 para colar no documento.

   Rotas:
     #/calculadora           → nova avaliação (rascunho salvo no navegador)
     #/calculadora/AV-003    → edita uma avaliação já registrada

   O rascunho fica salvo no navegador — fechar a aba não perde nada.
   ============================================================ */

const TelaCalculadora = (function () {
  const CHAVE_RASCUNHO = 'dionisio_qualidade_cs_calc_v1';
  const ID_RASCUNHO = '__rascunho__';

  function agoraLocal(d) {
    const x = d ? new Date(d) : new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(
      x.getMinutes()
    )}`;
  }

  function vazio() {
    return {
      id: '',
      cs: ATENDENTES[0] ? ATENDENTES[0].id : '',
      loja: '',
      canal: 'WhatsApp',
      assunto: '',
      classificacao: 'rotina',
      primeiraResposta: '',
      duracao: '',
      notas: {},
      observacoes: '',
      avaliadoEm: '',
    };
  }

  let dados = vazio();

  /** Chave dos prints: a avaliação salva usa o próprio id. */
  function chavePrints() {
    return dados.id || ID_RASCUNHO;
  }

  function carregarRascunho() {
    /* sempre parte do zero: sem isso, apagar o rascunho não limpava o
       formulário, porque `dados` seguia vivo em memória entre as telas */
    dados = vazio();
    try {
      const raw = localStorage.getItem(CHAVE_RASCUNHO);
      if (raw) dados = Object.assign(vazio(), JSON.parse(raw));
    } catch (e) {
      dados = vazio();
    }
    dados.id = '';
  }

  /** Abre uma avaliação já registrada para edição. */
  function carregarAvaliacao(id) {
    const av = Estado.avaliacao(id);
    if (!av) {
      UI.toast('Avaliação não encontrada.', true);
      dados = vazio();
      return;
    }
    dados = {
      id: av.id,
      cs: av.cs || '',
      loja: av.loja || '',
      canal: av.canal || 'WhatsApp',
      assunto: av.assunto || '',
      classificacao: av.contexto || 'rotina',
      primeiraResposta: av.primeiraRespostaMin == null ? '' : String(av.primeiraRespostaMin),
      duracao: av.duracaoMin == null ? '' : String(av.duracaoMin),
      notas: { ...(av.notas || {}) },
      observacoes: av.observacoes || '',
      avaliadoEm: av.avaliadoEm || '',
    };
  }

  function salvarRascunho() {
    if (dados.id) return; /* editando registro salvo: não mexe no rascunho */
    try {
      localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(dados));
    } catch (e) {
      /* rascunho é conveniência: se não couber, segue só em memória */
    }
  }

  /* ---------------------------------------------------------------- */
  /* dados para o cálculo, para a imagem e para a base                 */
  /* ---------------------------------------------------------------- */

  function numeroOuNulo(v) {
    return v === '' || v == null ? null : Number(v);
  }

  function dadosExport() {
    return {
      cs: dados.cs,
      loja: dados.loja.trim(),
      canal: dados.canal,
      assunto: dados.assunto.trim() || 'Avaliação de atendimento',
      contexto: dados.classificacao,
      primeiraRespostaMin: numeroOuNulo(dados.primeiraResposta),
      duracaoMin: numeroOuNulo(dados.duracao),
      res: Calc.calcular(dados.notas, dados.classificacao),
      observacoes: dados.observacoes.trim(),
      avaliador: 'Murilo B.',
      prints: Anexos.lista(chavePrints()),
    };
  }

  function registro() {
    return {
      id: dados.id || undefined,
      cs: dados.cs,
      loja: dados.loja.trim(),
      canal: dados.canal,
      assunto: dados.assunto.trim() || 'Avaliação de atendimento',
      contexto: dados.classificacao,
      primeiraRespostaMin: numeroOuNulo(dados.primeiraResposta),
      duracaoMin: numeroOuNulo(dados.duracao),
      notas: { ...dados.notas },
      observacoes: dados.observacoes.trim(),
      avaliador: 'Murilo B.',
      avaliadoEm: dados.avaliadoEm || new Date().toISOString(),
    };
  }

  /* ---------------------------------------------------------------- */
  /* HTML                                                              */
  /* ---------------------------------------------------------------- */

  function campo(id, rotulo, valor, placeholder, tipo, largo) {
    return `<label class="campo-form${largo ? ' campo-largo' : ''}">
      <span>${UI.esc(rotulo)}</span>
      <input type="${tipo || 'text'}" id="${id}" data-campo="${id}" value="${UI.esc(valor)}"
             placeholder="${UI.esc(placeholder || '')}" />
    </label>`;
  }

  function formHTML() {
    return `<div class="form-grid">
      <label class="campo-form">
        <span>CS avaliado <em>(agrupa no dashboard)</em></span>
        <select id="cs" data-campo="cs">
          ${ATENDENTES.map(
            (a) => `<option value="${a.id}"${dados.cs === a.id ? ' selected' : ''}>${UI.esc(a.nome)}</option>`
          ).join('')}
        </select>
      </label>
      ${campo('loja', 'Cliente / Loja', dados.loja, 'Ex.: Casa Fontana')}
      <label class="campo-form">
        <span>Canal</span>
        <select id="canal" data-campo="canal">
          ${['WhatsApp', 'Web', 'E-mail', 'Telefone', 'Instagram']
            .map((c) => `<option value="${c}"${dados.canal === c ? ' selected' : ''}>${c}</option>`)
            .join('')}
        </select>
      </label>
      ${campo(
        'assunto',
        'Assunto do atendimento',
        dados.assunto,
        'Ex.: Cliente não consegue reservar para setembro',
        'text',
        true
      )}
      <label class="campo-form campo-largo">
        <span>Classificação do atendimento <em>(só rótulo — não altera pesos)</em></span>
        <select id="classificacao" data-campo="classificacao">
          ${CONTEXTOS.map(
            (c) =>
              `<option value="${c.id}"${dados.classificacao === c.id ? ' selected' : ''}>${UI.esc(
                c.nome
              )}</option>`
          ).join('')}
        </select>
      </label>
    </div>`;
  }

  function tempoHTML() {
    return `<div class="grupo-crit">
      <div class="grupo-crit-head">Tempo <span class="grupo-crit-nota">informativo — não entra na média</span></div>
      <div class="crit crit-info">
        <div class="form-grid form-grid-2">
          ${campo('primeiraResposta', '1ª resposta (min)', dados.primeiraResposta, 'Ex.: 4', 'number')}
          ${campo('duracao', 'Duração total (min)', dados.duracao, 'Ex.: 47', 'number')}
        </div>
      </div>
    </div>`;
  }

  function html() {
    const res = Calc.calcular(dados.notas, dados.classificacao);
    const prints = Anexos.lista(chavePrints());
    const editando = !!dados.id;

    return `<div class="pagina pagina-full"><div class="aval-wrap">
      <div class="aval-top">
        <div class="aval-top-info">
          <div class="aval-top-titulo">
            <span class="tag tag-roxa">${editando ? '✎ ' + UI.esc(dados.id) : '＋ Nova'}</span>
            <h2>${editando ? 'Editar avaliação' : 'Nova avaliação'}</h2>
          </div>
          <div class="aval-top-sub">${
            editando
              ? 'Ajuste as notas ou o texto e salve — o dashboard atualiza na hora.'
              : 'Preencha os dados, dê as notas, anexe os prints e salve. O que você salva entra no dashboard e no histórico.'
          }</div>
        </div>
        <button class="btn btn-sm btn-fantasma" id="btnLimparCalc">${
          editando ? 'Cancelar edição' : 'Limpar tudo'
        }</button>
      </div>

      <div class="aval-corpo">
        <div class="calc-print-col">
          <div class="conversa-head">
            <span>Prints da conversa avaliada</span>
            <span id="contaPrints">${
              prints.length ? `${prints.length} print(s) anexado(s)` : 'nenhum print ainda'
            }</span>
          </div>
          <div class="calc-print-scroll">
            <div id="printWrap">${Ficha.printsHTML(prints, { grande: true })}</div>
          </div>
        </div>

        <div class="aval-col">
          <div class="aval-col-scroll">

            <div class="grupo-crit-head" style="padding-top:2px">Dados do atendimento</div>
            ${formHTML()}

            <div id="listaCriterios">
              ${Ficha.criteriosHTML(dados.notas)}
              ${tempoHTML()}
            </div>

            <div class="totais" id="boxTotais">${Ficha.totaisHTML(res)}</div>
            <div class="resultado" id="boxResultado">${Ficha.resultadoHTML(res)}</div>

            <label class="label-campo" for="txtObs">Observações / feedback ao CS</label>
            <textarea class="area" id="txtObs" data-campo="observacoes"
              placeholder="O que foi bem, o que repetir e o que ajustar no próximo atendimento…">${UI.esc(
                dados.observacoes
              )}</textarea>

            <div class="export-acoes">
              <button class="btn btn-primario btn-sm" id="btnSalvar">✓ ${
                editando ? 'Salvar alterações' : 'Salvar avaliação'
              }</button>
              <button class="btn btn-sm" id="btnCopiarImg">⧉ Copiar imagem</button>
              <button class="btn btn-sm" id="btnBaixarImg">↓ Baixar PNG</button>
              <button class="btn btn-sm btn-fantasma" id="btnAbrirImg">Pré-visualizar</button>
            </div>
            <div class="export-hint">Sai <strong>uma imagem só</strong>, com a ficha e a conversa juntas: nota e veredito, identificação, critérios com peso e ponderado, resultado, observações e os prints numerados. É só copiar e colar.</div>
          </div>

          <div class="aval-rodape">
            <span class="aviso ${res.completo ? 'aviso-ok' : ''}" id="avisoCalc">${
      res.completo ? 'Pronto para salvar.' : 'Dê nota em todos os critérios.'
    }</span>
            <button class="btn btn-sm" id="btnCopiarImg2">⧉ Copiar imagem</button>
            <button class="btn btn-primario" id="btnSalvar2">✓ ${
              editando ? 'Salvar alterações' : 'Salvar avaliação'
            }</button>
          </div>
        </div>
      </div>
    </div></div>`;
  }

  /* ---------------------------------------------------------------- */
  /* montagem                                                          */
  /* ---------------------------------------------------------------- */

  function montar(root, idAvaliacao) {
    if (idAvaliacao) carregarAvaliacao(idAvaliacao);
    else carregarRascunho();

    root.innerHTML = html();

    const atualizar = () => {
      const res = Ficha.atualizar(root, dados.notas, dados.classificacao);
      const aviso = UI.q('#avisoCalc', root);
      aviso.textContent = res.completo
        ? 'Pronto para salvar.'
        : `Dê nota em todos os critérios (${res.preenchidos}/${res.totalCriterios}).`;
      aviso.classList.toggle('aviso-ok', res.completo);
    };

    /* ---- campos ---- */
    UI.qq('[data-campo]', root).forEach((el) => {
      const guardar = () => {
        dados[el.dataset.campo] = el.value;
        salvarRascunho();
      };
      el.addEventListener('input', guardar);
      el.addEventListener('change', guardar);
    });

    /* ---- notas ---- */
    UI.on(root, 'click', '[data-nota]', (ev, btn) => {
      Ficha.alternarNota(dados.notas, btn.dataset.para, Number(btn.dataset.nota));
      salvarRascunho();
      atualizar();
    });

    /* ---- prints (vários) ---- */
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.hidden = true;
    root.appendChild(input);

    function redesenhar() {
      const prints = Anexos.lista(chavePrints());
      UI.q('#printWrap', root).innerHTML = Ficha.printsHTML(prints, { grande: true });
      UI.q('#contaPrints', root).textContent = prints.length
        ? `${prints.length} print(s) anexado(s)`
        : 'nenhum print ainda';
    }

    async function anexar(arquivos) {
      const lista = [...arquivos].filter((f) => f && /^image\//.test(f.type));
      if (!lista.length) {
        UI.toast('Anexe arquivos de imagem (print da conversa).', true);
        return;
      }
      let persistiuTudo = true;
      for (const f of lista) {
        try {
          const reduzido = await Ficha.lerPrint(f);
          if (!Anexos.adicionar(chavePrints(), reduzido)) persistiuTudo = false;
        } catch (err) {
          UI.toast('Não foi possível ler uma das imagens.', true);
        }
      }
      redesenhar();
      const total = Anexos.quantos(chavePrints());
      UI.toast(
        persistiuTudo
          ? `${lista.length > 1 ? lista.length + ' prints anexados' : 'Print anexado'} · ${total} no total.`
          : 'Print anexado só nesta sessão (navegador sem espaço para guardar).'
      );
    }

    input.addEventListener('change', (e) => {
      const arquivos = [...(e.target.files || [])];
      e.target.value = '';
      if (arquivos.length) anexar(arquivos);
    });

    UI.on(root, 'click', '[data-print]', (ev, el) => {
      if (el.dataset.print === 'remover') {
        Anexos.removerEm(chavePrints(), Number(el.dataset.indice));
        redesenhar();
        UI.toast('Print removido.');
        return;
      }
      input.click();
    });

    Ficha.ligarArraste(UI.q('#printWrap', root), anexar);

    UI.onGlobal('paste', 'print-calculadora', (e) => {
      if (!location.hash.includes('calculadora')) return;
      const arquivos = Ficha.imagensDoPaste(e);
      if (arquivos.length) {
        e.preventDefault();
        anexar(arquivos);
      }
    });

    /* ---- salvar na base (é o que faz aparecer no dashboard) ---- */
    function salvarNaBase() {
      const res = Calc.calcular(dados.notas, dados.classificacao);
      if (!res.completo) {
        UI.toast(
          `Faltam ${res.totalCriterios - res.preenchidos} critério(s) sem nota — a avaliação só entra no dashboard completa.`,
          true
        );
        return;
      }
      if (!dados.loja.trim()) {
        UI.toast('Preencha o cliente / loja.', true);
        return;
      }

      const editando = !!dados.id;
      const salvo = Estado.salvarAvaliacao(registro());

      /* prints do rascunho passam a pertencer à avaliação salva */
      if (!editando) {
        Anexos.mover(ID_RASCUNHO, salvo.id);
        localStorage.removeItem(CHAVE_RASCUNHO);
        dados = vazio();
        montar(root);
        UI.toast(`${salvo.id} salva · ${UI.num(res.notaFinal, 2)} de 5,00. Já está no dashboard.`);
      } else {
        UI.toast(`${salvo.id} atualizada · ${UI.num(res.notaFinal, 2)} de 5,00.`);
      }
      App.atualizarBadge();
    }

    UI.q('#btnSalvar', root).addEventListener('click', salvarNaBase);
    UI.q('#btnSalvar2', root).addEventListener('click', salvarNaBase);

    /* ---- exportar ---- */
    async function copiar(ev) {
      const b = ev.currentTarget;
      const antes = b.textContent;
      b.disabled = true;
      b.textContent = 'Gerando…';
      try {
        await Exportar.copiar(dadosExport());
        UI.toast('Imagem copiada — cole com Ctrl+V (avaliação e conversa juntas).');
      } catch (err) {
        await Exportar.baixar(dadosExport());
        UI.toast('Seu navegador não deixou copiar; baixei o PNG no lugar.', true);
      } finally {
        b.disabled = false;
        b.textContent = antes;
      }
    }

    async function baixar(ev) {
      const b = ev.currentTarget;
      const antes = b.textContent;
      b.disabled = true;
      b.textContent = 'Gerando…';
      try {
        await Exportar.baixar(dadosExport());
        UI.toast('PNG baixado.');
      } finally {
        b.disabled = false;
        b.textContent = antes;
      }
    }

    UI.q('#btnCopiarImg', root).addEventListener('click', copiar);
    UI.q('#btnBaixarImg', root).addEventListener('click', baixar);
    UI.q('#btnCopiarImg2', root).addEventListener('click', copiar);
    UI.q('#btnAbrirImg', root).addEventListener('click', () => Exportar.abrir(dadosExport()));

    /* ---- limpar / cancelar ---- */
    UI.q('#btnLimparCalc', root).addEventListener('click', () => {
      if (dados.id) {
        App.ir('historico');
        return;
      }
      if (!confirm('Limpar os dados, as notas e os prints desta avaliação?')) return;
      Anexos.limparDe(ID_RASCUNHO);
      dados = vazio();
      localStorage.removeItem(CHAVE_RASCUNHO);
      montar(root);
      UI.toast('Formulário limpo.');
    });
  }

  return { montar };
})();
