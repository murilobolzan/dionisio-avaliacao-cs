/* ============================================================
   ui.js — helpers de DOM, formatação e toast
   ============================================================ */

const UI = {
  /* ---------- texto / números ---------- */
  esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /** Escapa e converte \n em <br> (para bolhas de conversa). */
  escLinhas(s) {
    return UI.esc(s).replace(/\n/g, '<br>');
  },

  num(v, dec = 2) {
    return Number(v || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    });
  },

  /** Nota "4,5" sem decimal inútil: 5 → "5" · 4.5 → "4,5" */
  nota(v) {
    if (v === null || v === undefined) return '—';
    return Number.isInteger(v) ? String(v) : UI.num(v, 1);
  },

  pct(v, dec = 0) {
    return UI.num(v, dec) + '%';
  },

  data(iso, comHora = false) {
    if (!iso) return '—';
    const d = iso instanceof Date ? iso : new Date(iso);
    if (isNaN(d)) return '—';
    const dt = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    if (!comHora) return dt;
    return dt + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },

  dataLonga(iso) {
    const d = iso instanceof Date ? iso : new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  },

  duracao(min) {
    if (min < 60) return min + ' min';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  },

  /* ---------- DOM ---------- */
  q(sel, base) {
    return (base || document).querySelector(sel);
  },
  qq(sel, base) {
    return [...(base || document).querySelectorAll(sel)];
  },

  /**
   * Delegação de eventos: UI.on(container, 'click', '.btn', fn)
   *
   * O container (#conteudo) sobrevive à troca de telas, então o registro é
   * idempotente: chamar de novo com o mesmo evento+seletor NÃO empilha outro
   * listener (sem isso, um clique disparava duas vezes depois de re-renderizar).
   */
  on(base, evento, seletor, fn) {
    if (!base.__delegados) base.__delegados = new Map();
    const chave = evento + '|' + seletor;
    const anterior = base.__delegados.get(chave);
    if (anterior) {
      anterior.fn = fn; /* mantém o listener, troca só o callback */
      return;
    }
    const reg = { fn };
    base.__delegados.set(chave, reg);
    base.addEventListener(evento, (ev) => {
      const alvo = ev.target.closest(seletor);
      if (alvo && base.contains(alvo)) reg.fn(ev, alvo);
    });
  },

  /* ---------- selos ---------- */
  tagCanal(canal) {
    const cls = canal === 'WhatsApp' ? 'tag-wpp' : 'tag-web';
    const ico = canal === 'WhatsApp' ? '✆' : '⌘';
    return `<span class="tag ${cls}">${ico} ${UI.esc(canal)}</span>`;
  },

  tagStatus(res) {
    if (!res) return '<span class="tag tag-pendente">● Pendente</span>';
    return res.aprovado
      ? `<span class="tag tag-ok">✓ ${UI.num(res.notaFinal, 2)}</span>`
      : `<span class="tag tag-ruim">✗ ${UI.num(res.notaFinal, 2)}</span>`;
  },

  tagContexto(id) {
    return `<span class="tag tag-roxa">${UI.esc(Calc.contexto(id).nome)}</span>`;
  },

  /**
   * Listener no document com registro único por chave — trocar de tela não
   * empilha outro handler (mesmo motivo do UI.on acima).
   */
  onGlobal(evento, chave, fn) {
    if (!UI._globais) UI._globais = new Map();
    const k = evento + '|' + chave;
    const reg = UI._globais.get(k);
    if (reg) {
      reg.fn = fn;
      return;
    }
    const novo = { fn };
    UI._globais.set(k, novo);
    document.addEventListener(evento, (ev) => novo.fn(ev));
  },

  /* ---------- imagens ---------- */
  arquivoParaDataURL(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error('leitura'));
      r.readAsDataURL(file);
    });
  },

  /** Reduz/recomprime o print para caber no localStorage sem perder legibilidade. */
  async reduzirImagem(dataURL, maxLargura = 1400, qualidade = 0.85) {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('imagem'));
      i.src = dataURL;
    });
    if (img.width <= maxLargura && dataURL.length < 600000) return dataURL;
    const escala = Math.min(1, maxLargura / img.width);
    const cv = document.createElement('canvas');
    cv.width = Math.round(img.width * escala);
    cv.height = Math.round(img.height * escala);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', qualidade);
  },

  /* ---------- toast ---------- */
  toast(msg, erro = false) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.toggle('erro', !!erro);
    el.hidden = false;
    clearTimeout(UI._t);
    UI._t = setTimeout(() => {
      el.hidden = true;
    }, 3200);
  },

  /** Cor semântica da nota (usada só em marcas/ícones, nunca no texto do rótulo). */
  corNota(nota, corte) {
    if (nota >= corte) return 'var(--success)';
    if (nota >= corte - 1) return 'var(--warning)';
    return 'var(--danger)';
  },
};
