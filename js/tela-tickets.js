/* ============================================================
   tela-tickets.js — Fila de tickets (tela 1)
   Lista os tickets, filtra e abre a avaliação.
   ============================================================ */

const TelaTickets = (function () {
  const filtro = { busca: '', atendente: '', canal: '', status: '', contexto: '' };

  function ticketsFiltrados() {
    const b = filtro.busca.trim().toLowerCase();
    return Estado.tickets()
      .slice()
      .sort((x, y) => new Date(y.abertoEm) - new Date(x.abertoEm))
      .filter((t) => {
        const av = Estado.avaliacaoDoTicket(t.id);
        if (filtro.atendente && t.atendente !== filtro.atendente) return false;
        if (filtro.canal && t.canal !== filtro.canal) return false;
        if (filtro.contexto && (av ? av.contexto : t.contextoSugerido) !== filtro.contexto) return false;
        if (filtro.status === 'pendente' && av) return false;
        if (filtro.status === 'avaliado' && !av) return false;
        if (filtro.status === 'abaixo' && (!av || Calc.resultado(av).aprovado)) return false;
        if (b) {
          const alvo = [t.id, t.loja, t.contato, t.assunto, Calc.atendente(t.atendente).nome, ...(t.tags || [])]
            .join(' ')
            .toLowerCase();
          if (!alvo.includes(b)) return false;
        }
        return true;
      });
  }

  function kpis(lista) {
    const avaliados = lista.filter((t) => Estado.avaliacaoDoTicket(t.id));
    const notas = avaliados.map((t) => Calc.resultado(Estado.avaliacaoDoTicket(t.id)).notaFinal);
    const media = notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : 0;
    const abaixo = avaliados.filter((t) => !Calc.resultado(Estado.avaliacaoDoTicket(t.id)).aprovado).length;

    const cards = [
      { label: 'Tickets na fila', valor: lista.length, hint: 'Resultado dos filtros atuais', ico: '✉' },
      { label: 'Aguardando avaliação', valor: lista.length - avaliados.length, hint: 'Nenhuma nota registrada', ico: '◔' },
      { label: 'Avaliados', valor: avaliados.length, hint: 'Com média ponderada registrada', ico: '★' },
      {
        label: 'Nota média',
        valor: notas.length ? UI.num(media, 2) : '—',
        hint: notas.length ? `${abaixo} abaixo do corte` : 'Avalie um ticket para começar',
        ico: '◈',
      },
    ];

    return `<div class="grid-kpi">${cards
      .map(
        (c) => `<div class="card">
          <div class="kpi-topo">
            <span class="kpi-label">${c.label}</span>
            <span class="kpi-ico">${c.ico}</span>
          </div>
          <div class="kpi-valor tnum">${c.valor}</div>
          <div class="kpi-hint">${UI.esc(c.hint)}</div>
        </div>`
      )
      .join('')}</div>`;
  }

  function linhaTicket(t) {
    const av = Estado.avaliacaoDoTicket(t.id);
    const res = av ? Calc.resultado(av) : null;
    const ctxId = av ? av.contexto : t.contextoSugerido;
    const at = Calc.atendente(t.atendente);
    const msgs = t.mensagens.filter((m) => m.de !== 'nota').length;

    return `<button class="ticket" data-ticket="${t.id}">
      <span class="ticket-main">
        <span class="ticket-linha1">
          <span class="ticket-id mono">${t.id}</span>
          ${UI.tagContexto(ctxId)}
          ${(t.tags || []).map((tag) => `<span class="tag tag-neutra">${UI.esc(tag)}</span>`).join('')}
        </span>
        <span class="ticket-assunto" title="${UI.esc(t.assunto)}">${UI.esc(t.assunto)}</span>
        <span class="ticket-sub">${UI.esc(t.loja)} · ${UI.esc(t.contato)} · ${msgs} mensagens · ${UI.duracao(
      t.duracaoMin
    )}</span>
      </span>
      <span class="col-atendente">
        <span class="ticket-col-label">Atendente</span>
        <span class="ticket-col-valor">${UI.esc(at.nome)}</span>
      </span>
      <span class="col-canal">
        <span class="ticket-col-label">${UI.data(t.abertoEm)}</span>
        <span class="ticket-col-valor">${UI.tagCanal(t.canal)}</span>
      </span>
      <span class="ticket-acao">${UI.tagStatus(res)}</span>
    </button>`;
  }

  function html() {
    const lista = ticketsFiltrados();
    const opt = (v, r, sel) => `<option value="${v}"${sel === v ? ' selected' : ''}>${UI.esc(r)}</option>`;

    return `<div class="pagina">
      <div class="pagina-head">
        <h1>Fila de Tickets</h1>
        <p>Selecione um ticket para ler a conversa e registrar a avaliação do atendimento.</p>
      </div>

      ${kpis(lista)}

      <div class="secao-titulo">Tickets</div>
      <div class="secao-sub">Ordenados do mais recente para o mais antigo. ${lista.length} de ${
      Estado.tickets().length
    } tickets.</div>

      <div class="filtros">
        <label class="campo campo-busca">
          <span>⌕</span>
          <input type="search" id="fBusca" placeholder="Buscar por loja, assunto, ticket ou tag…" value="${UI.esc(
            filtro.busca
          )}" />
        </label>
        <label class="campo">
          <span>Atendente</span>
          <select id="fAtendente">${opt('', 'Todos', filtro.atendente)}${ATENDENTES.map((a) =>
      opt(a.id, a.nome, filtro.atendente)
    ).join('')}</select>
        </label>
        <label class="campo">
          <span>Canal</span>
          <select id="fCanal">${opt('', 'Todos', filtro.canal)}${opt('WhatsApp', 'WhatsApp', filtro.canal)}${opt(
      'Web',
      'Web',
      filtro.canal
    )}</select>
        </label>
        <label class="campo">
          <span>Contexto</span>
          <select id="fContexto">${opt('', 'Todos', filtro.contexto)}${CONTEXTOS.map((c) =>
      opt(c.id, c.nome, filtro.contexto)
    ).join('')}</select>
        </label>
        <label class="campo">
          <span>Status</span>
          <select id="fStatus">${opt('', 'Todos', filtro.status)}${opt(
      'pendente',
      'Aguardando avaliação',
      filtro.status
    )}${opt('avaliado', 'Já avaliados', filtro.status)}${opt(
      'abaixo',
      'Abaixo do esperado',
      filtro.status
    )}</select>
        </label>
        <button class="btn btn-fantasma btn-sm" id="fLimpar">Limpar filtros</button>
      </div>

      <div class="lista-tickets">
        ${
          lista.length
            ? lista.map(linhaTicket).join('')
            : '<div class="vazio">Nenhum ticket encontrado com esses filtros.</div>'
        }
      </div>

      <div class="rodape-lista">
        <span>Dados fictícios de demonstração · as avaliações ficam salvas neste navegador (localStorage).</span>
        <span style="display:flex;gap:8px">
          <button class="btn btn-sm" id="btnRestaurar">Restaurar demo</button>
          <button class="btn btn-sm btn-perigo" id="btnZerar">Zerar avaliações</button>
        </span>
      </div>
    </div>`;
  }

  function montar(root) {
    root.innerHTML = html();

    const rerender = () => montar(root);

    const bind = (id, evento, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(evento, fn);
    };

    /* busca sem perder o foco: filtra e só reordena a lista */
    const inputBusca = document.getElementById('fBusca');
    inputBusca.addEventListener('input', (e) => {
      filtro.busca = e.target.value;
      const lista = ticketsFiltrados();
      UI.q('.lista-tickets', root).innerHTML = lista.length
        ? lista.map(linhaTicket).join('')
        : '<div class="vazio">Nenhum ticket encontrado com esses filtros.</div>';
      UI.q('.secao-sub', root).textContent = `Ordenados do mais recente para o mais antigo. ${lista.length} de ${
        Estado.tickets().length
      } tickets.`;
    });

    bind('fAtendente', 'change', (e) => {
      filtro.atendente = e.target.value;
      rerender();
    });
    bind('fCanal', 'change', (e) => {
      filtro.canal = e.target.value;
      rerender();
    });
    bind('fContexto', 'change', (e) => {
      filtro.contexto = e.target.value;
      rerender();
    });
    bind('fStatus', 'change', (e) => {
      filtro.status = e.target.value;
      rerender();
    });
    bind('fLimpar', 'click', () => {
      Object.assign(filtro, { busca: '', atendente: '', canal: '', status: '', contexto: '' });
      rerender();
    });

    bind('btnRestaurar', 'click', () => {
      Estado.restaurarDemo();
      UI.toast('Avaliações de demonstração restauradas.');
      App.atualizarBadge();
      rerender();
    });
    bind('btnZerar', 'click', () => {
      if (!confirm('Apagar todas as avaliações registradas neste navegador?')) return;
      Estado.limpar();
      UI.toast('Avaliações apagadas.');
      App.atualizarBadge();
      rerender();
    });

    UI.on(root, 'click', '[data-ticket]', (ev, el) => App.ir('avaliar/' + el.dataset.ticket));
  }

  return { montar };
})();
