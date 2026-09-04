/* ============================================================
   graficos.js — gráficos em SVG puro (sem biblioteca)

   Especificação seguida:
   · marcas finas (barra 14px), ponta arredondada 4px na extremidade do dado
   · linha 2px, marcador r=5 com anel de 2px na cor da superfície
   · grade hairline 1px sólida, recessiva
   · série única → sem legenda (o título diz o que está plotado)
   · rótulo direto seletivo + tooltip no hover + "ver tabela" (acessibilidade)
   · texto nunca usa a cor da série
   ============================================================ */

const Viz = (function () {
  const SUP = '#1c1830'; /* superfície do card (--bg-card) */
  const SERIE = '#8b5cf6';
  const SERIE_FORTE = '#a78bfa';
  const GRID = '#2c2740';
  const BASE = '#383152';
  const TXT2 = '#a3a0b8';
  const TXT3 = '#6e6a87';
  const OK = '#22c55e';
  const RUIM = '#ef4444';

  const specs = new Map();
  let seq = 0;

  /* ------------------------------------------------------------------ */
  /* casca do card                                                       */
  /* ------------------------------------------------------------------ */
  function card(tipo, opts) {
    const id = 'viz' + ++seq;
    specs.set(id, { tipo, opts });
    const temTabela = !!(opts.tabela && opts.tabela.linhas && opts.tabela.linhas.length);
    return `
      <section class="card viz-card">
        <div class="viz-head">
          <div>
            <div class="viz-titulo">${UI.esc(opts.titulo)}</div>
            ${opts.sub ? `<div class="viz-sub">${UI.esc(opts.sub)}</div>` : '<div class="viz-sub"></div>'}
          </div>
          ${temTabela ? `<button class="btn btn-sm btn-fantasma" data-tabela="${id}">Ver tabela</button>` : ''}
        </div>
        <div class="viz-body" data-viz="${id}"></div>
        ${opts.legenda ? legenda(opts.legenda) : ''}
        ${temTabela ? `<div class="viz-tabela" id="tab-${id}" hidden>${tabelaHTML(opts.tabela)}</div>` : ''}
      </section>`;
  }

  function legenda(itens) {
    return `<div class="viz-legenda">${itens
      .map(
        (i) =>
          `<span class="viz-legenda-item"><span class="viz-swatch" style="background:${i.cor}"></span>${
            i.icone ? UI.esc(i.icone) + ' ' : ''
          }${UI.esc(i.rotulo)}</span>`
      )
      .join('')}</div>`;
  }

  function tabelaHTML(t) {
    return `<div class="tabela-wrap"><table class="tbl">
      <thead><tr>${t.colunas
        .map((c, i) => `<th${i > 0 ? ' style="text-align:right"' : ''}>${UI.esc(c)}</th>`)
        .join('')}</tr></thead>
      <tbody>${t.linhas
        .map(
          (l) =>
            `<tr>${l
              .map((v, i) => (i === 0 ? `<td>${UI.esc(v)}</td>` : `<td class="num">${UI.esc(v)}</td>`))
              .join('')}</tr>`
        )
        .join('')}</tbody></table></div>`;
  }

  /* ------------------------------------------------------------------ */
  /* geometria                                                           */
  /* ------------------------------------------------------------------ */

  /** Retângulo com as duas pontas direitas arredondadas (barra horizontal). */
  function barraH(x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w, h / 2));
    if (w <= 0.5) return `M${x},${y} h0.5 v${h} h-0.5 Z`;
    return `M${x},${y} h${w - rr} a${rr},${rr} 0 0 1 ${rr},${rr} v${h - 2 * rr} a${rr},${rr} 0 0 1 ${-rr},${rr} h${-(
      w - rr
    )} Z`;
  }

  function tt(html) {
    return `data-tt="${UI.esc(html)}"`;
  }

  /* ------------------------------------------------------------------ */
  /* 1. barras horizontais (nota 0–5)                                    */
  /* ------------------------------------------------------------------ */
  function desenharBarras(largura, o) {
    const dados = o.dados;
    if (!dados.length) return vazio(largura, 'Sem dados no período.');

    const gutter = Math.min(158, Math.max(96, Math.round(largura * 0.34)));
    const padR = 44;
    const topo = 16;
    const rowH = dados.length > 6 ? 30 : 34;
    const barH = 14;
    const alt = topo + dados.length * rowH + 26;
    const x0 = gutter;
    const x1 = largura - padR;
    const esc = (v) => x0 + (Math.max(0, Math.min(5, v)) / 5) * (x1 - x0);

    let s = `<svg viewBox="0 0 ${largura} ${alt}" width="${largura}" height="${alt}" role="img" aria-label="${UI.esc(
      o.titulo
    )}">`;

    /* grade 0..5 */
    for (let v = 0; v <= 5; v++) {
      const x = esc(v);
      s += `<line x1="${x}" y1="${topo}" x2="${x}" y2="${topo + dados.length * rowH}" stroke="${
        v === 0 ? BASE : GRID
      }" stroke-width="1" />`;
      s += `<text x="${x}" y="${alt - 8}" fill="${TXT3}" font-size="10.5" text-anchor="middle">${v}</text>`;
    }

    /* linha de corte */
    if (o.corte) {
      const xc = esc(o.corte);
      s += `<line x1="${xc}" y1="${topo - 8}" x2="${xc}" y2="${topo + dados.length * rowH}" stroke="#f59e0b" stroke-width="1" opacity="0.75" />`;
      s += `<text x="${xc}" y="${topo - 11}" fill="#fbbf24" font-size="9.5" text-anchor="middle">corte ${UI.num(
        o.corte,
        1
      )}</text>`;
    }

    dados.forEach((d, i) => {
      const y = topo + i * rowH + (rowH - barH) / 2;
      const w = esc(d.valor) - x0;

      /* rótulo (cor de texto, nunca a cor da série) */
      const rot = d.rotulo.length > 22 ? d.rotulo.slice(0, 21) + '…' : d.rotulo;
      s += `<text x="${gutter - 10}" y="${y + barH / 2 + 3.6}" fill="${TXT2}" font-size="11.5" text-anchor="end">${UI.esc(
        rot
      )}</text>`;

      /* marca */
      s += `<path d="${barraH(x0, y, w, barH, 4)}" fill="${SERIE}" />`;

      /* valor na ponta */
      s += `<text x="${esc(d.valor) + 7}" y="${y + barH / 2 + 3.8}" fill="#f0eeff" font-size="11.5" font-weight="600" style="font-variant-numeric:tabular-nums">${UI.num(
        d.valor,
        2
      )}</text>`;

      /* alvo de hover maior que a marca */
      s += `<rect class="barra-hit" x="0" y="${topo + i * rowH}" width="${largura}" height="${rowH}" ${tt(
        d.tooltip || `<b>${d.rotulo}</b><span class="tt-linha">${UI.num(d.valor, 2)}</span>`
      )} />`;
    });

    return s + '</svg>';
  }

  /* ------------------------------------------------------------------ */
  /* 2. linha (evolução)                                                 */
  /* ------------------------------------------------------------------ */
  function desenharLinha(largura, o) {
    const pts = o.pontos;
    if (pts.length < 1) return vazio(largura, 'Sem dados no período.');

    const alt = 208;
    const padL = 32;
    const padR = 46;
    const padT = 16;
    const padB = 30;
    const minV = Math.min(3, Math.floor(Math.min(...pts.map((p) => p.valor)) * 2) / 2 - 0.5);
    const maxV = 5;
    const x0 = padL;
    const x1 = largura - padR;
    const y0 = alt - padB;
    const y1 = padT;
    const ex = (i) => (pts.length === 1 ? (x0 + x1) / 2 : x0 + (i / (pts.length - 1)) * (x1 - x0));
    const ey = (v) => y0 - ((v - minV) / (maxV - minV)) * (y0 - y1);

    let s = `<svg viewBox="0 0 ${largura} ${alt}" width="${largura}" height="${alt}" role="img" aria-label="${UI.esc(
      o.titulo
    )}">`;

    /* grade horizontal de 0,5 em 0,5 */
    for (let v = minV; v <= maxV + 0.001; v += 0.5) {
      const y = ey(v);
      s += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${GRID}" stroke-width="1" />`;
      s += `<text x="${x0 - 7}" y="${y + 3.5}" fill="${TXT3}" font-size="10" text-anchor="end" style="font-variant-numeric:tabular-nums">${UI.num(
        v,
        1
      )}</text>`;
    }

    /* corte */
    if (o.corte && o.corte >= minV && o.corte <= maxV) {
      const yc = ey(o.corte);
      s += `<line x1="${x0}" y1="${yc}" x2="${x1}" y2="${yc}" stroke="#f59e0b" stroke-width="1" opacity="0.8" />`;
      s += `<text x="${x1 + 5}" y="${yc + 3.5}" fill="#fbbf24" font-size="9.5">corte</text>`;
    }

    /* linha */
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${ex(i).toFixed(1)},${ey(p.valor).toFixed(1)}`).join(' ');
    s += `<path d="${d}" fill="none" stroke="${SERIE_FORTE}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`;

    /* pontos + eixo x */
    pts.forEach((p, i) => {
      const x = ex(i);
      const y = ey(p.valor);
      s += `<circle cx="${x}" cy="${y}" r="5" fill="${SERIE_FORTE}" stroke="${SUP}" stroke-width="2" />`;
      s += `<text x="${x}" y="${alt - 9}" fill="${TXT3}" font-size="10" text-anchor="middle">${UI.esc(p.rotulo)}</text>`;
      const w = pts.length === 1 ? largura : (x1 - x0) / (pts.length - 1);
      s += `<rect class="barra-hit" x="${x - w / 2}" y="${y1 - 10}" width="${w}" height="${y0 - y1 + 20}" ${tt(
        p.tooltip || `<b>${p.rotulo}</b><span class="tt-linha">${UI.num(p.valor, 2)}</span>`
      )} />`;
    });

    /* rótulo direto só no último ponto */
    const ult = pts[pts.length - 1];
    s += `<text x="${ex(pts.length - 1) + 9}" y="${ey(ult.valor) + 4}" fill="#f0eeff" font-size="11.5" font-weight="600" style="font-variant-numeric:tabular-nums">${UI.num(
      ult.valor,
      2
    )}</text>`;

    s += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="${BASE}" stroke-width="1" />`;
    return s + '</svg>';
  }

  /* ------------------------------------------------------------------ */
  /* 3. meter empilhado (veredito)                                       */
  /* ------------------------------------------------------------------ */
  function desenharMeter(largura, o) {
    const total = o.partes.reduce((s, p) => s + p.valor, 0);
    if (!total) return vazio(largura, 'Sem avaliações no período.');

    const alt = 66;
    const h = 24;
    const y = 12;
    const gap = 2;
    let x = 0;
    let s = `<svg viewBox="0 0 ${largura} ${alt}" width="${largura}" height="${alt}" role="img" aria-label="${UI.esc(
      o.titulo
    )}">`;

    const visiveis = o.partes.filter((p) => p.valor > 0);
    visiveis.forEach((p, i) => {
      const bruta = (p.valor / total) * largura;
      const w = Math.max(3, bruta - (i < visiveis.length - 1 ? gap : 0));
      const r = i === visiveis.length - 1 ? 4 : 0;
      s += `<path d="${barraH(x, y, w, h, r || 0.001)}" fill="${p.cor}" />`;
      if (w > 46) {
        const pctTxt = UI.num((p.valor / total) * 100, 0) + '%';
        s += `<text x="${x + w / 2}" y="${y + h / 2 + 4}" fill="#08130a" font-size="11.5" font-weight="700" text-anchor="middle">${pctTxt}</text>`;
      }
      s += `<rect class="barra-hit" x="${x}" y="${y - 8}" width="${bruta}" height="${h + 16}" ${tt(
        `<b>${p.icone} ${p.rotulo}</b><span class="tt-linha">${p.valor} de ${total} · ${UI.num(
          (p.valor / total) * 100,
          1
        )}%</span>`
      )} />`;
      x += bruta;
    });

    s += `<text x="0" y="${alt - 6}" fill="${TXT3}" font-size="10.5">${total} avaliação(ões) no período</text>`;
    return s + '</svg>';
  }

  function vazio(largura, msg) {
    return `<svg viewBox="0 0 ${largura} 80" width="${largura}" height="80"><text x="${
      largura / 2
    }" y="44" fill="${TXT3}" font-size="12" text-anchor="middle">${UI.esc(msg)}</text></svg>`;
  }

  /* ------------------------------------------------------------------ */
  /* pintura + interação                                                 */
  /* ------------------------------------------------------------------ */
  function pintar() {
    UI.qq('[data-viz]').forEach((box) => {
      const spec = specs.get(box.dataset.viz);
      if (!spec) return;
      const largura = Math.max(240, Math.floor(box.clientWidth || box.parentElement.clientWidth || 380));
      const fn =
        spec.tipo === 'barras' ? desenharBarras : spec.tipo === 'linha' ? desenharLinha : desenharMeter;
      box.innerHTML = fn(largura, spec.opts);
    });
  }

  let redraw;
  window.addEventListener('resize', () => {
    clearTimeout(redraw);
    redraw = setTimeout(pintar, 140);
  });

  /* tooltip global */
  const elTt = () => document.getElementById('tooltip');
  document.addEventListener('mousemove', (ev) => {
    const alvo = ev.target.closest('[data-tt]');
    const t = elTt();
    if (!alvo) {
      t.hidden = true;
      return;
    }
    t.innerHTML = alvo.getAttribute('data-tt');
    t.hidden = false;
    const r = t.getBoundingClientRect();
    let x = ev.clientX + 14;
    let y = ev.clientY - r.height - 10;
    if (x + r.width > window.innerWidth - 8) x = ev.clientX - r.width - 14;
    if (y < 8) y = ev.clientY + 16;
    t.style.left = x + 'px';
    t.style.top = y + 'px';
  });
  document.addEventListener('mouseleave', () => {
    elTt().hidden = true;
  });

  /* botão "ver tabela" */
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-tabela]');
    if (!b) return;
    const box = document.getElementById('tab-' + b.dataset.tabela);
    if (!box) return;
    box.hidden = !box.hidden;
    b.textContent = box.hidden ? 'Ver tabela' : 'Ocultar tabela';
  });

  return {
    barras: (o) => card('barras', o),
    linha: (o) => card('linha', o),
    meter: (o) => card('meter', o),
    pintar,
    limpar: () => specs.clear(),
    cores: { SERIE, SERIE_FORTE, OK, RUIM },
  };
})();
