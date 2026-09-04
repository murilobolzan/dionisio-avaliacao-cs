/* ============================================================
   ficha.js — componentes compartilhados da ficha de avaliação

   Usados pela tela de avaliação (ticket da fila) e pela calculadora
   de ticket (avulsa), para que a régua seja literalmente a mesma:
   critérios com peso fixo, notas inteiras de 0 a 5, totais, nota
   final, veredito e a galeria de prints.
   ============================================================ */

const Ficha = (function () {
  const NOTAS_POSSIVEIS = [0, 1, 2, 3, 4, 5];

  /** Texto da escala para a nota escolhida (ou convite quando não há nota). */
  function textoEscala(c, nota) {
    const escala = c.escala || {};
    if (nota === null || nota === undefined) {
      return '<span class="escala-vazia">Escolha a nota — passe o mouse em cada uma para ver o que significa.</span>';
    }
    return `<b>Nota ${nota}:</b> ${UI.esc(escala[nota] || '—')}`;
  }

  /** Bloco de um critério: nome, o que observar, peso, notas, escala e ponderado. */
  function critHTML(c, nota) {
    const peso = PESOS[c.id];
    const escala = c.escala || {};
    return `<div class="crit${nota === null ? ' crit-vazio' : ''}" data-crit="${c.id}">
      <div class="crit-head">
        <div>
          <div class="crit-nome">${UI.esc(c.nome)}</div>
          <div class="crit-obs">${UI.esc(c.observar)}</div>
        </div>
        <span class="crit-peso">peso ${peso}</span>
      </div>
      <div class="crit-notas">
        ${NOTAS_POSSIVEIS.map(
          (n) =>
            `<button class="chip-nota" data-nota="${n}" data-para="${c.id}" aria-pressed="${
              nota === n ? 'true' : 'false'
            }" title="${UI.esc(n + ' — ' + (escala[n] || ''))}">${n}</button>`
        ).join('')}
      </div>
      <div class="crit-escala" data-escala="${c.id}">${textoEscala(c, nota)}</div>
      <button class="crit-verescala" data-verescala="${c.id}">ver escala completa</button>
      <ol class="crit-escala-lista" id="escala-${c.id}" hidden>
        ${NOTAS_POSSIVEIS.map(
          (n) =>
            `<li${nota === n ? ' class="atual"' : ''}><b>${n}</b><span>${UI.esc(
              escala[n] || '—'
            )}</span></li>`
        ).join('')}
      </ol>
      <div class="crit-rodape">
        <span>Nota × peso</span>
        <span class="crit-pond" data-pond="${c.id}">${
          nota === null ? '—' : `${UI.nota(nota)} × ${peso} = <strong>${UI.num(nota * peso, 1)}</strong>`
        }</span>
      </div>
    </div>`;
  }

  /** Todos os grupos de critérios, na ordem da planilha. */
  function criteriosHTML(notas) {
    return GRUPOS_CRITERIOS.map(
      (g) => `<div class="grupo-crit">
        <div class="grupo-crit-head">${UI.esc(g.nome)}</div>
        ${g.criterios.map((c) => critHTML(c, notas[c.id] ?? null)).join('')}
      </div>`
    ).join('');
  }

  function totaisHTML(res) {
    return `<span>Totais (${res.preenchidos}/${res.totalCriterios} critérios)</span>
      <span>Σ pesos <strong class="tnum">${res.somaPesos}</strong> · Σ ponderado <strong class="tnum">${UI.num(
      res.somaPonderada,
      1
    )}</strong></span>`;
  }

  function resultadoHTML(res) {
    const veredito = !res.completo
      ? `<div class="veredito veredito-vazio">Faltam ${res.totalCriterios - res.preenchidos} critério(s)</div>`
      : res.aprovado
      ? '<div class="veredito veredito-ok">✓ DENTRO DO ESPERADO</div>'
      : '<div class="veredito veredito-ruim">✗ ABAIXO DO ESPERADO</div>';

    return `<div class="resultado-head">Resultado</div>
      <div class="resultado-nota">
        <b class="tnum">${res.completo ? UI.num(res.notaFinal, 2) : '—'}</b>
        <span>de 5,00 · média ponderada</span>
      </div>
      <div class="resultado-corte">Corte mínimo exigido: <strong class="tnum">${UI.num(
        res.corte,
        1
      )}</strong></div>
      ${veredito}`;
  }

  /**
   * Galeria de prints: miniaturas numeradas (com remover) + área para
   * adicionar mais. Aceita quantos prints o avaliador quiser.
   */
  function printsHTML(lista, opcoes) {
    const o = opcoes || {};
    const itens = (lista || [])
      .map(
        (src, i) => `<figure class="print-item${o.grande ? ' print-item-grande' : ''}">
          <img src="${src}" alt="Print ${i + 1} da conversa" />
          <figcaption>
            <span class="print-num">Print ${i + 1}</span>
            <button class="btn btn-sm btn-perigo" data-print="remover" data-indice="${i}">Remover</button>
          </figcaption>
        </figure>`
      )
      .join('');

    const temAlgum = (lista || []).length > 0;
    const area = `<div class="print-box vazia${temAlgum ? ' compacta' : ''}" data-print="anexar" tabindex="0">
      <span class="print-ico">${temAlgum ? '＋' : '🖼'}</span>
      <strong>${temAlgum ? 'Adicionar outro print' : 'Cole com Ctrl+V, arraste ou clique aqui'}</strong>
      <span class="print-hint">${
        temAlgum
          ? 'Pode colar ou soltar vários — entram na imagem em sequência.'
          : 'Pode anexar mais de um. Todos entram na imagem final, numerados.'
      }</span>
    </div>`;

    return `<div class="print-galeria">${itens}${area}</div>`;
  }

  /**
   * Atualiza in loco o que depende das notas (ponderados, totais, resultado)
   * sem re-renderizar a tela — preserva foco e rolagem.
   */
  function atualizar(root, notas, contexto) {
    const res = Calc.calcular(notas, contexto);

    CRITERIOS.forEach((c) => {
      const nota = notas[c.id] ?? null;
      const peso = PESOS[c.id];
      const pond = UI.q(`[data-pond="${c.id}"]`, root);
      if (!pond) return;
      pond.innerHTML =
        nota === null ? '—' : `${UI.nota(nota)} × ${peso} = <strong>${UI.num(nota * peso, 1)}</strong>`;
      UI.q(`[data-crit="${c.id}"]`, root).classList.toggle('crit-vazio', nota === null);
      UI.qq(`[data-para="${c.id}"]`, root).forEach((b) =>
        b.setAttribute('aria-pressed', Number(b.dataset.nota) === nota ? 'true' : 'false')
      );

      const escala = UI.q(`[data-escala="${c.id}"]`, root);
      if (escala) escala.innerHTML = textoEscala(c, nota);
      const lista = document.getElementById(`escala-${c.id}`);
      if (lista)
        UI.qq("li", lista).forEach((li, i) =>
          li.classList.toggle('atual', NOTAS_POSSIVEIS[i] === nota)
        );
    });

    const totais = UI.q('#boxTotais', root);
    if (totais) totais.innerHTML = totaisHTML(res);
    const resultado = UI.q('#boxResultado', root);
    if (resultado) resultado.innerHTML = resultadoHTML(res);

    return res;
  }

  /** Alterna a nota de um critério (clicar na mesma nota limpa). */
  function alternarNota(notas, criterio, valor) {
    if (notas[criterio] === valor) delete notas[criterio];
    else notas[criterio] = valor;
    return notas;
  }

  /** Lê um arquivo de imagem, reduz e devolve o dataURL pronto para guardar. */
  async function lerPrint(file) {
    if (!file || !/^image\//.test(file.type)) throw new Error('nao-imagem');
    const bruto = await UI.arquivoParaDataURL(file);
    return UI.reduzirImagem(bruto, 1400);
  }

  /** Liga arrastar-e-soltar numa área de print (aceita vários arquivos). */
  function ligarArraste(wrap, aoReceber) {
    const marcar = (lig) => {
      const alvo = wrap.querySelector('.print-box');
      if (alvo) alvo.classList.toggle('arrastando', lig);
    };
    ['dragenter', 'dragover'].forEach((ev) =>
      wrap.addEventListener(ev, (e) => {
        e.preventDefault();
        marcar(true);
      })
    );
    ['dragleave', 'drop'].forEach((ev) =>
      wrap.addEventListener(ev, (e) => {
        e.preventDefault();
        marcar(false);
      })
    );
    wrap.addEventListener('drop', (e) => {
      const arquivos = [...((e.dataTransfer && e.dataTransfer.files) || [])];
      if (arquivos.length) aoReceber(arquivos);
    });
  }

  /** Pega todas as imagens de um evento de colar (Ctrl+V). */
  function imagensDoPaste(e) {
    const itens = [...((e.clipboardData && e.clipboardData.items) || [])];
    return itens
      .filter((it) => it.type && it.type.indexOf('image') === 0)
      .map((it) => it.getAsFile())
      .filter(Boolean);
  }

  return {
    NOTAS_POSSIVEIS,
    textoEscala,
    critHTML,
    criteriosHTML,
    totaisHTML,
    resultadoHTML,
    printsHTML,
    atualizar,
    alternarNota,
    lerPrint,
    ligarArraste,
    imagensDoPaste,
  };
})();

/* Abre/fecha a escala completa de um critério (registro único no document). */
UI.onGlobal('click', 'ficha-escala', (ev) => {
  const b = ev.target.closest('[data-verescala]');
  if (!b) return;
  const lista = document.getElementById('escala-' + b.dataset.verescala);
  if (!lista) return;
  lista.hidden = !lista.hidden;
  b.textContent = lista.hidden ? 'ver escala completa' : 'ocultar escala';
});
