/* ============================================================
   tela-historico.js — Avaliações registradas

   Lê as avaliações direto da base (elas guardam CS, loja, assunto
   e data em si mesmas). Daqui você reabre para editar, gera as
   folhas A4 de novo ou exclui.
   ============================================================ */

const TelaHistorico = (function () {
  const filtro = { atendente: '', veredito: '', periodo: 'tudo' };

  function linhas() {
    return Metricas.base(filtro).slice().reverse().filter((r) =>
      filtro.veredito === 'ok' ? r.res.aprovado : filtro.veredito === 'ruim' ? !r.res.aprovado : true
    );
  }

  function html() {
    const dados = linhas();
    const opt = (v, r, sel) => `<option value="${v}"${sel === v ? ' selected' : ''}>${UI.esc(r)}</option>`;

    const corpo = dados.length
      ? `<div class="tabela-wrap"><table class="tbl">
          <thead><tr>
            <th>Atendimento</th><th>CS avaliado</th><th>Classificação</th>
            <th style="text-align:right">Nota</th><th style="text-align:right">Corte</th>
            <th>Veredito</th><th style="text-align:right">Avaliado em</th><th></th>
          </tr></thead>
          <tbody>${dados
            .map(
              (r) => `<tr>
              <td>
                <div style="font-weight:500">${UI.esc(r.av.assunto || 'Atendimento sem assunto')}</div>
                <div style="font-size:.75rem;color:var(--txt-3)"><span class="mono">${UI.esc(
                  r.av.id
                )}</span> · ${UI.esc(r.av.loja || '—')}${
                r.av.canal ? ' · ' + UI.esc(r.av.canal) : ''
              }${
                Anexos.quantos(r.av.id) ? ' · ' + Anexos.quantos(r.av.id) + ' print(s)' : ''
              }</div>
                ${
                  r.av.observacoes
                    ? `<div style="font-size:.75rem;color:var(--txt-2);margin-top:4px;max-width:430px">“${UI.esc(
                        r.av.observacoes.length > 150
                          ? r.av.observacoes.slice(0, 150) + '…'
                          : r.av.observacoes
                      )}”</div>`
                    : ''
                }
              </td>
              <td>${UI.esc(Calc.atendente(r.cs).nome)}</td>
              <td>${UI.tagContexto(r.av.contexto)}</td>
              <td class="num" style="font-weight:600">${UI.num(r.res.notaFinal, 2)}</td>
              <td class="num" style="color:var(--txt-3)">${UI.num(r.res.corte, 1)}</td>
              <td>${
                r.res.aprovado
                  ? '<span class="tag tag-ok">✓ Dentro</span>'
                  : '<span class="tag tag-ruim">✗ Abaixo</span>'
              }</td>
              <td class="num" style="color:var(--txt-2)">${UI.data(r.av.avaliadoEm, true)}</td>
              <td><div class="tbl-acoes">
                <button class="btn btn-sm" data-editar="${r.av.id}">Editar</button>
                <button class="btn btn-sm btn-fantasma" data-folhas="${r.av.id}">⧉ Imagem</button>
                <button class="btn btn-sm btn-perigo" data-excluir="${r.av.id}">Excluir</button>
              </div></td>
            </tr>`
            )
            .join('')}</tbody></table></div>`
      : `<div class="vazio">Nenhuma avaliação ${
          filtro.periodo === 'tudo' ? 'registrada ainda' : 'neste período'
        }. Abra <strong>Nova avaliação</strong> para registrar a primeira.</div>`;

    const btnPeriodo = (id, rot) =>
      `<button class="aba${filtro.periodo === id ? ' ativa' : ''}" data-periodo="${id}">${rot}</button>`;

    return `<div class="pagina">
      <div class="pagina-head">
        <h1>Avaliações registradas</h1>
        <p>Tudo que você avaliou. Clique em “Editar” para ajustar as notas ou em “⧉ Imagem” para copiar a avaliação com a conversa.</p>
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
          <select id="hAtendente">${opt('', 'Todos', filtro.atendente)}${ATENDENTES.map((a) =>
      opt(a.id, a.nome, filtro.atendente)
    ).join('')}</select>
        </label>
        <label class="campo">
          <span>Veredito</span>
          <select id="hVeredito">${opt('', 'Todos', filtro.veredito)}${opt(
      'ok',
      'Dentro do esperado',
      filtro.veredito
    )}${opt('ruim', 'Abaixo do esperado', filtro.veredito)}</select>
        </label>
        <span style="font-size:.78rem;color:var(--txt-3)">${dados.length} avaliação(ões)</span>
      </div>

      ${corpo}

      ${backupHTML()}
    </div>`;
  }

  /** Onde os dados moram + backup em arquivo. */
  function backupHTML() {
    const r = Backup.resumo();
    return `<div class="backup-bar">
      <div class="backup-info">
        <strong>Onde suas avaliações ficam guardadas</strong>
        <span><b class="tnum">${r.avaliacoes}</b> avaliação(ões) · <b class="tnum">${r.totalPrints}</b> print(s) · ${UI.num(r.mb, 1)} MB
        — salvas neste navegador, no endereço <code>${UI.esc(location.origin)}</code>.</span>
        <span class="backup-aviso">Elas sobrevivem a fechar a aba e reiniciar o PC. Mas abrir o app por <em>outro endereço</em> (ou em outro computador) mostra uma base vazia — por isso guarde o backup no Drive.</span>
      </div>
      <div class="backup-acoes">
        <button class="btn btn-primario btn-sm" id="btnBackup">↓ Baixar backup</button>
        <button class="btn btn-sm" id="btnRestaurar">↑ Restaurar backup</button>
      </div>
    </div>`;
  }
  function montar(root) {
    root.innerHTML = html();
    const rerender = () => montar(root);

    UI.on(root, 'click', '[data-periodo]', (ev, el) => {
      filtro.periodo = el.dataset.periodo;
      rerender();
    });
    UI.q('#hAtendente', root).addEventListener('change', (e) => {
      filtro.atendente = e.target.value;
      rerender();
    });
    UI.q('#hVeredito', root).addEventListener('change', (e) => {
      filtro.veredito = e.target.value;
      rerender();
    });

    UI.on(root, 'click', '[data-editar]', (ev, el) => App.ir('calculadora/' + el.dataset.editar));

    /* ---- backup em arquivo ---- */
    UI.q('#btnBackup', root).addEventListener('click', () => {
      const n = Backup.exportar();
      UI.toast(`Backup baixado com ${n} avaliação(ões). Guarde no Drive.`);
    });

    const inputBackup = document.createElement('input');
    inputBackup.type = 'file';
    inputBackup.accept = 'application/json,.json';
    inputBackup.hidden = true;
    root.appendChild(inputBackup);

    inputBackup.addEventListener('change', async (e) => {
      const file = (e.target.files || [])[0];
      e.target.value = '';
      if (!file) return;
      const substituir = confirm(
        'OK = SUBSTITUIR tudo pelo backup (apaga o que está aqui agora).\n\n' +
          'Cancelar = JUNTAR: mantém o que já existe e acrescenta o que faltar.'
      );
      try {
        const r = await Backup.importar(file, substituir ? 'substituir' : 'juntar');
        App.atualizarBadge();
        montar(root);
        UI.toast(
          r.modo === 'substituir'
            ? `Backup restaurado: ${r.adicionadas} avaliação(ões).`
            : `${r.adicionadas} avaliação(ões) acrescentada(s); ${r.ignoradas} já existia(m).`
        );
      } catch (err) {
        UI.toast(err.message || 'Não consegui ler esse arquivo.', true);
      }
    });

    UI.q('#btnRestaurar', root).addEventListener('click', () => inputBackup.click());

    UI.on(root, 'click', '[data-folhas]', async (ev, el) => {
      const av = Estado.avaliacao(el.dataset.folhas);
      if (!av) return;
      el.disabled = true;
      const antes = el.textContent;
      el.textContent = '…';
      try {
        const gerar = {
          cs: av.cs,
          loja: av.loja,
          canal: av.canal,
          assunto: av.assunto,
          contexto: av.contexto,
          primeiraRespostaMin: av.primeiraRespostaMin,
          duracaoMin: av.duracaoMin,
          res: Calc.resultado(av),
          observacoes: av.observacoes,
          avaliador: av.avaliador,
          prints: Anexos.lista(av.id),
        };
        try {
          await Exportar.copiar(gerar);
          UI.toast('Imagem copiada — cole com Ctrl+V.');
        } catch (err) {
          await Exportar.baixar(gerar);
          UI.toast('Seu navegador não deixou copiar; baixei o PNG no lugar.', true);
        }
      } finally {
        el.disabled = false;
        el.textContent = antes;
      }
    });

    UI.on(root, 'click', '[data-excluir]', (ev, el) => {
      if (!confirm('Excluir esta avaliação? Os prints dela também saem.')) return;
      Anexos.limparDe(el.dataset.excluir);
      Estado.excluirAvaliacao(el.dataset.excluir);
      App.atualizarBadge();
      UI.toast('Avaliação excluída.');
      rerender();
    });
  }

  return { montar };
})();
