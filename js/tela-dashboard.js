/* ============================================================
   tela-dashboard.js — Dashboard de Qualidade

   Feito para a apresentação semanal: o recorte padrão é a semana
   (segunda a domingo) e há duas leituras na mesma tela —
   o time completo e a quebra por membro.
   ============================================================ */

const TelaDashboard = (function () {
  const filtro = { periodo: 'semana', atendente: '' };

  function kpisHTML(r) {
    const cards = [
      {
        label: 'Avaliações no período',
        valor: r.total,
        hint: r.total ? `${r.csAvaliados} CS avaliado(s)` : 'Nenhuma avaliação ainda',
        ico: '★',
      },
      {
        label: 'Dentro do esperado',
        valor: r.total ? UI.pct(r.pctAprovacao, 0) : '—',
        hint: `${r.aprovados} de ${r.total} atingiram o corte`,
        ico: '✓',
      },
      {
        label: 'Abaixo do esperado',
        valor: r.reprovados,
        hint: 'Casos que pedem feedback 1:1',
        ico: '⚑',
      },
      {
        label: 'Corte mínimo',
        valor: UI.num(CORTE_MINIMO, 1),
        hint: `Média ponderada · Σ pesos ${CRITERIOS.reduce((s, c) => s + PESOS[c.id], 0)}`,
        ico: '◎',
      },
    ];
    return `<div class="grid-kpi">${cards
      .map(
        (c) => `<div class="card">
          <div class="kpi-topo"><span class="kpi-label">${c.label}</span><span class="kpi-ico">${c.ico}</span></div>
          <div class="kpi-valor tnum">${c.valor}</div>
          <div class="kpi-hint">${UI.esc(c.hint)}</div>
        </div>`
      )
      .join('')}</div>`;
  }

  function heroHTML(r, corte, quem) {
    const dif = r.media - corte;
    const acima = dif >= 0;
    return `<div class="card" style="grid-column:1/-1">
      <div class="kpi-topo">
        <div>
          <span class="kpi-label">Nota média de ${UI.esc(quem)} (média ponderada, 0–5)</span>
          <div class="hero" style="margin-top:8px">
            <span class="hero-num tnum">${r.total ? UI.num(r.media, 2) : '—'}</span>
            <span class="hero-de">de 5,00</span>
          </div>
          <div class="kpi-hint" style="margin-top:8px">
            ${
              r.total
                ? `${acima ? '▲' : '▼'} ${UI.num(Math.abs(dif), 2)} ${
                    acima ? 'acima' : 'abaixo'
                  } do corte mínimo exigido (${UI.num(corte, 2)}) · ${r.total} avaliação(ões)`
                : 'Nenhuma avaliação neste período. Registre em “Nova avaliação”.'
            }
          </div>
        </div>
        <span class="kpi-ico" style="width:42px;height:42px;flex-basis:42px;font-size:1.1rem">◈</span>
      </div>
    </div>`;
  }

  /** Quebra por membro: um card por CS, com a média de cada critério. */
  function porMembroHTML(lista) {
    if (!lista.length) return '<div class="vazio">Sem avaliações neste período.</div>';

    return `<div class="grid-membros">${lista
      .map((m) => {
        const ok = m.media >= CORTE_MINIMO;
        return `<div class="card membro">
          <div class="membro-head">
            <div>
              <div class="membro-nome">${UI.esc(m.nome)}</div>
              <div class="membro-sub">${m.n} avaliação(ões) no período</div>
            </div>
            <span class="membro-nota ${ok ? 'ok' : 'ruim'} tnum">${UI.num(m.media, 2)}</span>
          </div>
          <div class="membro-crits">
            ${m.criterios
              .map(
                (c) => `<div class="membro-crit">
                  <span class="membro-crit-rot">${UI.esc(c.curto)}</span>
                  <span class="membro-barra"><i style="width:${(c.media / 5) * 100}%"></i></span>
                  <span class="membro-crit-val tnum">${UI.num(c.media, 1)}</span>
                </div>`
              )
              .join('')}
          </div>
          <button class="btn btn-sm btn-fantasma" data-so="${m.id}">Ver só ${UI.esc(
          m.nome
        )} →</button>
        </div>`;
      })
      .join('')}</div>`;
  }

  /** Junta tudo que o relatório precisa, já com os filtros da tela. */
  function dadosRelatorio() {
    const iv = Periodo.intervalo(filtro.periodo);
    return {
      periodoRot: iv.rot,
      intervalo: filtro.periodo === 'tudo' ? '' : Periodo.rotulo(filtro.periodo),
      quem: filtro.atendente ? Calc.atendente(filtro.atendente).nome : 'Todo o time',
      corte: CORTE_MINIMO,
      somaPesos: CRITERIOS.reduce((s, c) => s + PESOS[c.id], 0),
      resumo: Metricas.resumo(filtro),
      porAtendente: Metricas.porAtendente(filtro),
      porCriterio: Metricas.porCriterio(filtro),
      porMembro: Metricas.criteriosPorAtendente(filtro),
      avaliador: 'Murilo B.',
      /* a lista de avaliações só entra no relatório individual; no do time
         completo o que importa é o panorama, não caso a caso */
      mostrarItens: !!filtro.atendente,
      itens: Metricas.base(filtro)
        .slice()
        .reverse()
        .map((r) => ({
          cs: Calc.atendente(r.cs).nome,
          loja: r.av.loja,
          assunto: r.av.assunto,
          classificacao: Calc.contexto(r.av.contexto).nome,
          nota: r.res.notaFinal,
          aprovado: r.res.aprovado,
        })),
    };
  }

  function html() {
    Viz.limpar();

    const r = Metricas.resumo(filtro);
    const corte = Metricas.corteMedio();
    const porAt = Metricas.porAtendente(filtro);
    const porCrit = Metricas.porCriterio(filtro);
    const evo = Metricas.evolucao(filtro);
    const porCtx = Metricas.porContexto(filtro);
    const porMembro = Metricas.criteriosPorAtendente(filtro);

    const quem = filtro.atendente ? Calc.atendente(filtro.atendente).nome : 'todo o time';
    const rotPeriodo = Periodo.rotulo(filtro.periodo);

    /* ---- gráficos ---- */
    const gRanking = Viz.barras({
      titulo: 'Ranking por CS',
      sub: 'Nota média ponderada de cada atendente no período.',
      corte,
      dados: porAt.map((a) => ({
        rotulo: a.nome,
        valor: a.media,
        tooltip: `<b>${UI.esc(a.nome)}</b><span class="tt-linha">Nota média ${UI.num(
          a.media,
          2
        )}</span><span class="tt-linha">${a.avaliacoes} avaliação(ões) · ${UI.num(
          a.pctAprovacao,
          0
        )}% dentro do esperado</span>`,
      })),
      tabela: {
        colunas: ['CS avaliado', 'Nota média', 'Avaliações', '% dentro'],
        linhas: porAt.map((a) => [a.nome, UI.num(a.media, 2), String(a.avaliacoes), UI.pct(a.pctAprovacao, 0)]),
      },
    });

    const gCrit = Viz.barras({
      titulo: 'Média por critério',
      sub: 'Onde se ganha e onde se perde ponto (nota bruta, antes do peso).',
      corte,
      dados: porCrit.map((c) => ({
        rotulo: c.curto,
        valor: c.media,
        tooltip: `<b>${UI.esc(c.nome)}</b><span class="tt-linha">Média ${UI.num(c.media, 2)} em ${
          c.n
        } avaliação(ões)</span>`,
      })),
      tabela: {
        colunas: ['Critério', 'Média', 'Avaliações'],
        linhas: porCrit.map((c) => [c.nome, UI.num(c.media, 2), String(c.n)]),
      },
    });

    const gEvo = Viz.linha({
      titulo: 'Evolução semana a semana',
      sub: 'Todas as semanas com avaliação (não depende do filtro de período).',
      corte,
      pontos: evo.map((s) => ({
        rotulo: UI.data(s.data).slice(0, 5),
        valor: s.media,
        tooltip: `<b>Semana de ${UI.data(s.data)}</b><span class="tt-linha">Nota média ${UI.num(
          s.media,
          2
        )}</span><span class="tt-linha">${s.n} avaliação(ões)</span>`,
      })),
      tabela: {
        colunas: ['Semana', 'Nota média', 'Avaliações'],
        linhas: evo.map((s) => [UI.data(s.data), UI.num(s.media, 2), String(s.n)]),
      },
    });

    const gVeredito = Viz.meter({
      titulo: 'Veredito das avaliações',
      sub: `Proporção que atingiu o corte mínimo de ${UI.num(CORTE_MINIMO, 1)}.`,
      partes: [
        { rotulo: 'Dentro do esperado', valor: r.aprovados, cor: Viz.cores.OK, icone: '✓' },
        { rotulo: 'Abaixo do esperado', valor: r.reprovados, cor: Viz.cores.RUIM, icone: '✗' },
      ],
      legenda: [
        { rotulo: `Dentro do esperado (${r.aprovados})`, cor: Viz.cores.OK, icone: '✓' },
        { rotulo: `Abaixo do esperado (${r.reprovados})`, cor: Viz.cores.RUIM, icone: '✗' },
      ],
      tabela: {
        colunas: ['Veredito', 'Avaliações', '%'],
        linhas: [
          ['Dentro do esperado', String(r.aprovados), UI.pct(r.total ? (r.aprovados / r.total) * 100 : 0, 0)],
          ['Abaixo do esperado', String(r.reprovados), UI.pct(r.total ? (r.reprovados / r.total) * 100 : 0, 0)],
        ],
      },
    });

    /* ---- classificação ---- */
    const tabCtx = porCtx.length
      ? `<div class="tabela-wrap"><table class="tbl">
          <thead><tr><th>Classificação do atendimento</th><th style="text-align:right">Avaliações</th><th style="text-align:right">Nota média</th><th style="text-align:right">Corte</th><th style="text-align:right">Dentro do esperado</th></tr></thead>
          <tbody>${porCtx
            .map(
              (c) => `<tr>
                <td>${UI.tagContexto(c.id)}</td>
                <td class="num">${c.n}</td>
                <td class="num" style="font-weight:600">${UI.num(c.media, 2)}</td>
                <td class="num" style="color:var(--txt-3)">${UI.num(CORTE_MINIMO, 1)}</td>
                <td class="num">${c.aprovados}/${c.n}</td>
              </tr>`
            )
            .join('')}</tbody></table></div>`
      : '<div class="vazio">Sem avaliações no período.</div>';

    /* ---- pontos de atenção ---- */
    const atencao = Metricas.base(filtro)
      .filter((x) => !x.res.aprovado)
      .sort((a, b) => a.res.notaFinal - b.res.notaFinal);

    const listaAtencao = atencao.length
      ? `<div class="lista-tickets">${atencao
          .map(
            (x) => `<button class="ticket" data-editar="${x.av.id}">
              <span class="ticket-main">
                <span class="ticket-linha1">
                  <span class="ticket-id mono">${UI.esc(x.av.id)}</span>
                  ${UI.tagContexto(x.av.contexto)}
                  <span class="tag tag-ruim">✗ ${UI.num(x.res.notaFinal, 2)} · corte ${UI.num(
              x.res.corte,
              1
            )}</span>
                </span>
                <span class="ticket-assunto">${UI.esc(x.av.assunto || 'Atendimento sem assunto')}</span>
                <span class="ticket-sub">${UI.esc(x.av.loja || '—')} · ${UI.esc(
              x.av.observacoes || 'Sem observações registradas.'
            )}</span>
              </span>
              <span class="col-atendente">
                <span class="ticket-col-label">CS avaliado</span>
                <span class="ticket-col-valor">${UI.esc(Calc.atendente(x.cs).nome)}</span>
              </span>
              <span class="col-canal">
                <span class="ticket-col-label">Avaliado em</span>
                <span class="ticket-col-valor">${UI.data(x.av.avaliadoEm)}</span>
              </span>
              <span class="ticket-acao"><span class="tag tag-neutra">Revisar →</span></span>
            </button>`
          )
          .join('')}</div>`
      : '<div class="vazio">Nenhuma avaliação abaixo do corte no período. 🎉</div>';

    /* ---- filtros ---- */
    const btnPeriodo = (id, rot) =>
      `<button class="aba${filtro.periodo === id ? ' ativa' : ''}" data-periodo="${id}">${rot}</button>`;
    const opt = (v, rot) => `<option value="${v}"${filtro.atendente === v ? ' selected' : ''}>${UI.esc(rot)}</option>`;

    return `<div class="pagina">
      <div class="pagina-head">
        <h1>Dashboard de Qualidade</h1>
        <p>${UI.esc(Periodo.intervalo(filtro.periodo).rot)}${
          filtro.periodo === 'tudo' ? '' : ' · <strong>' + UI.esc(rotPeriodo) + '</strong>'
        } · ${UI.esc(quem)}</p>
      </div>

      <div class="filtros">
        <div class="abas" style="margin:0">
          ${btnPeriodo('semana', 'Esta semana')}${btnPeriodo('semana-passada', 'Semana passada')}${btnPeriodo(
      'mes',
      'Este mês'
    )}${btnPeriodo('tudo', 'Tudo')}
        </div>
        <label class="campo">
          <span>CS avaliado</span>
          <select id="dAtendente">${opt('', 'Todo o time')}${ATENDENTES.map((a) => opt(a.id, a.nome)).join(
      ''
    )}</select>
        </label>
        <div class="filtros-acoes">
          <button class="btn btn-primario btn-sm" id="btnRelCopiar">⧉ Copiar relatório</button>
          <button class="btn btn-sm" id="btnRelBaixar">↓ PNG</button>
          <button class="btn btn-sm btn-fantasma" id="btnRelAbrir">Pré-visualizar</button>
        </div>
      </div>

      <div class="grid-kpi" style="margin-bottom:14px">${heroHTML(r, corte, quem)}</div>
      ${kpisHTML(r)}

      <div class="secao-titulo">Por membro do time</div>
      <div class="secao-sub">A leitura individual da semana: nota final de cada um e a média em cada critério (0 a 5).</div>
      ${porMembroHTML(porMembro)}

      <div class="secao-titulo">Desempenho do time</div>
      <div class="secao-sub">Barras com a nota média de 0 a 5. A marca laranja é o corte mínimo exigido (${UI.num(
        CORTE_MINIMO,
        1
      )}).</div>
      <div class="grid-graficos">
        ${gRanking}
        ${gCrit}
        ${gEvo}
        ${gVeredito}
      </div>

      <div class="secao-titulo">Por classificação do atendimento</div>
      <div class="secao-sub">Os pesos e o corte são os mesmos para todos; a classificação serve para comparar cenários parecidos.</div>
      ${tabCtx}

      <div class="secao-titulo">Pontos de atenção</div>
      <div class="secao-sub">Avaliações abaixo do corte, da pior para a menos grave. Clique para reabrir e revisar.</div>
      ${listaAtencao}
    </div>`;
  }

  function montar(root) {
    root.innerHTML = html();
    Viz.pintar();

    const rerender = () => montar(root);

    UI.on(root, 'click', '[data-periodo]', (ev, el) => {
      filtro.periodo = el.dataset.periodo;
      rerender();
    });
    UI.q('#dAtendente', root).addEventListener('change', (e) => {
      filtro.atendente = e.target.value;
      rerender();
    });
    UI.on(root, 'click', '[data-so]', (ev, el) => {
      filtro.atendente = el.dataset.so;
      rerender();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    UI.on(root, 'click', '[data-editar]', (ev, el) => App.ir('calculadora/' + el.dataset.editar));

    /* ---- exportar o relatório da tela ---- */
    async function comBotao(b, fn, okMsg) {
      const antes = b.textContent;
      b.disabled = true;
      b.textContent = 'Gerando…';
      try {
        await fn();
        UI.toast(okMsg);
      } catch (err) {
        await Relatorio.baixar(dadosRelatorio());
        UI.toast('Seu navegador não deixou copiar; baixei o PNG no lugar.', true);
      } finally {
        b.disabled = false;
        b.textContent = antes;
      }
    }

    UI.q('#btnRelCopiar', root).addEventListener('click', (e) =>
      comBotao(e.currentTarget, () => Relatorio.copiar(dadosRelatorio()), 'Relatório copiado — cole com Ctrl+V.')
    );
    UI.q('#btnRelBaixar', root).addEventListener('click', (e) =>
      comBotao(e.currentTarget, () => Relatorio.baixar(dadosRelatorio()), 'PNG do relatório baixado.')
    );
    UI.q('#btnRelAbrir', root).addEventListener('click', () => Relatorio.abrir(dadosRelatorio()));
  }

  return { montar };
})();
