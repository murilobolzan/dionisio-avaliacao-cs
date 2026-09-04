/* ============================================================
   estado.js — store (localStorage), cálculo da média ponderada
   e agregações do dashboard.

   A AVALIAÇÃO É AUTOSSUFICIENTE: ela guarda o CS, a loja, o canal,
   o assunto e a data do atendimento dentro dela mesma. Não depende
   de existir um ticket na fila — é isso que faz tudo que você avalia
   aparecer no dashboard e no histórico.

   Único arquivo que sabe de onde vêm os dados: trocar por API aqui.
   ============================================================ */

const CHAVE = 'dionisio_qualidade_cs_v2';

const Estado = (function () {
  let avaliacoes = [];

  /** Registro antigo (preso a um ticket) → registro autossuficiente. */
  function migrar(a) {
    if (a.cs) return a;
    const t = TICKETS.find((x) => x.id === a.ticketId);
    return {
      ...a,
      cs: t ? t.atendente : '',
      loja: a.loja || (t ? t.loja : ''),
      canal: a.canal || (t ? t.canal : ''),
      assunto: a.assunto || (t ? t.assunto : ''),
      quando: a.quando || (t ? t.abertoEm : a.avaliadoEm),
    };
  }

  function carregar() {
    try {
      const raw = localStorage.getItem(CHAVE);
      if (raw) {
        const obj = JSON.parse(raw);
        avaliacoes = (Array.isArray(obj) ? obj : []).map(migrar);
        return;
      }
    } catch (e) {
      console.warn('Falha ao ler localStorage.', e);
    }
    avaliacoes = AVALIACOES_DEMO.map((a) => ({ ...a, notas: { ...a.notas } }));
    persistir();
  }

  function persistir() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(avaliacoes));
      return true;
    } catch (e) {
      console.warn('Não foi possível persistir as avaliações.', e);
      return false;
    }
  }

  function proximoId() {
    const nums = avaliacoes
      .map((a) => parseInt(String(a.id).replace(/\D/g, ''), 10))
      .filter((n) => !isNaN(n));
    const max = nums.length ? Math.max(...nums) : 0;
    return 'AV-' + String(max + 1).padStart(3, '0');
  }

  return {
    init: carregar,

    /* ---------- tickets (hoje vazio; amanhã: GET /tickets) ---------- */
    tickets: () => TICKETS,
    ticket: (id) => TICKETS.find((t) => t.id === id) || null,

    /* ---------- avaliações ---------- */
    avaliacoes: () => avaliacoes.slice(),
    avaliacao: (id) => avaliacoes.find((a) => a.id === id) || null,
    avaliacaoDoTicket: (ticketId) =>
      (ticketId && avaliacoes.find((a) => a.ticketId === ticketId)) || null,

    /**
     * Cria ou atualiza uma avaliação.
     * Com `id`, edita a existente; sem `id`, cria uma nova.
     * Devolve o registro salvo (já com o id definitivo).
     */
    salvarAvaliacao(dados) {
      const alvo =
        (dados.id && avaliacoes.find((a) => a.id === dados.id)) ||
        (dados.ticketId && avaliacoes.find((a) => a.ticketId === dados.ticketId));

      if (alvo) {
        Object.assign(alvo, dados, { id: alvo.id, atualizadoEm: new Date().toISOString() });
        persistir();
        if (typeof Nuvem !== 'undefined') Nuvem.enviar(alvo);
        return alvo;
      }
      const nova = { ...dados, id: proximoId(), atualizadoEm: new Date().toISOString() };
      avaliacoes.push(nova);
      persistir();
      if (typeof Nuvem !== 'undefined') Nuvem.enviar(nova);
      return nova;
    },

    excluirAvaliacao(id) {
      const i = avaliacoes.findIndex((a) => a.id === id);
      if (i >= 0) {
        avaliacoes.splice(i, 1);
        persistir();
        if (typeof Nuvem !== 'undefined') Nuvem.excluir(id);
        return true;
      }
      return false;
    },

    restaurarDemo() {
      avaliacoes = AVALIACOES_DEMO.map((a) => ({ ...a, notas: { ...a.notas } }));
      persistir();
    },

    /** Troca a base inteira de uma vez (restaurar backup). */
    substituirTudo(lista) {
      avaliacoes = (Array.isArray(lista) ? lista : []).map(migrar);
      return persistir();
    },

    limpar() {
      avaliacoes = [];
      persistir();
    },
  };
})();

/* ============================================================
   Períodos — o dashboard é apresentado toda semana, então a
   semana (segunda a domingo) é o recorte principal.
   ============================================================ */

const Periodo = {
  /** Segunda-feira 00:00 da semana de uma data. */
  inicioDaSemana(d) {
    const x = new Date(d);
    const dow = (x.getDay() + 6) % 7; /* 0 = segunda */
    x.setDate(x.getDate() - dow);
    x.setHours(0, 0, 0, 0);
    return x;
  },

  /** Intervalo [de, ate) de um preset. */
  intervalo(id, agora) {
    const hoje = agora ? new Date(agora) : new Date();
    const seg = Periodo.inicioDaSemana(hoje);

    if (id === 'semana') {
      const ate = new Date(seg);
      ate.setDate(ate.getDate() + 7);
      return { de: seg, ate, rot: 'Esta semana' };
    }
    if (id === 'semana-passada') {
      const de = new Date(seg);
      de.setDate(de.getDate() - 7);
      return { de, ate: seg, rot: 'Semana passada' };
    }
    if (id === 'mes') {
      const de = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
      return { de, ate, rot: 'Este mês' };
    }
    return { de: null, ate: null, rot: 'Todo o histórico' };
  },

  /** "18/08 a 24/08" — para o cabeçalho do dashboard. */
  rotulo(id, agora) {
    const iv = Periodo.intervalo(id, agora);
    if (!iv.de) return 'todo o histórico';
    const fim = new Date(iv.ate.getTime() - 1);
    return UI.data(iv.de) + ' a ' + UI.data(fim);
  },
};

/* ============================================================
   Cálculo
   ============================================================ */

const Calc = {
  contexto(id) {
    return CONTEXTOS.find((c) => c.id === id) || CONTEXTOS[0];
  },

  atendente(id) {
    return ATENDENTES.find((a) => a.id === id) || { id, nome: id || '—', iniciais: '??' };
  },

  /**
   * Média ponderada dos critérios.
   * @param {Object} notas       { criterioId: 0..5 (inteiro) }
   * @param {String} contextoId  só rótulo; pesos e corte são fixos
   */
  calcular(notas, contextoId) {
    const ctx = Calc.contexto(contextoId);
    const linhas = CRITERIOS.map((c) => {
      const peso = PESOS[c.id] ?? 1;
      const nota = notas && typeof notas[c.id] === 'number' ? notas[c.id] : null;
      return {
        id: c.id,
        nome: c.nome,
        peso,
        nota,
        ponderado: nota === null ? 0 : nota * peso,
      };
    });

    const somaPesos = linhas.reduce((s, l) => s + l.peso, 0);
    const somaPonderada = linhas.reduce((s, l) => s + l.ponderado, 0);
    const preenchidos = linhas.filter((l) => l.nota !== null).length;
    const completo = preenchidos === linhas.length;
    const notaFinal = somaPesos > 0 ? somaPonderada / somaPesos : 0;

    return {
      linhas,
      somaPesos,
      somaPonderada,
      preenchidos,
      totalCriterios: linhas.length,
      completo,
      notaFinal,
      corte: CORTE_MINIMO,
      aprovado: completo && notaFinal >= CORTE_MINIMO,
      contexto: ctx,
    };
  },

  /** Avaliação (registro salvo) → resultado calculado. */
  resultado(av) {
    return Calc.calcular(av.notas, av.contexto);
  },
};

/* ============================================================
   Agregações do dashboard — leem a avaliação, não o ticket.
   ============================================================ */

const Metricas = {
  /**
   * Avaliações filtradas, já com o resultado calculado.
   * @param {Object} f { periodo: 'semana'|'semana-passada'|'mes'|'tudo', atendente }
   */
  base(f) {
    const filtro = f || {};
    const iv = Periodo.intervalo(filtro.periodo || 'tudo');

    return Estado.avaliacoes()
      .map((av) => ({
        av,
        res: Calc.resultado(av),
        quando: new Date(av.avaliadoEm),
        cs: av.cs || '',
      }))
      .filter((r) => (iv.de ? r.quando >= iv.de && r.quando < iv.ate : true))
      .filter((r) => (filtro.atendente ? r.cs === filtro.atendente : true))
      .sort((a, b) => a.quando - b.quando);
  },

  resumo(filtro) {
    const b = Metricas.base(filtro);
    const notas = b.map((r) => r.res.notaFinal);
    const media = notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : 0;
    const aprovados = b.filter((r) => r.res.aprovado).length;

    return {
      total: b.length,
      media,
      aprovados,
      reprovados: b.length - aprovados,
      pctAprovacao: b.length ? (aprovados / b.length) * 100 : 0,
      csAvaliados: new Set(b.map((r) => r.cs)).size,
    };
  },

  /** Um item por CS — a base do "separado por membro". */
  porAtendente(filtro) {
    const b = Metricas.base(filtro);
    const mapa = new Map();
    b.forEach((r) => {
      const id = r.cs;
      if (!mapa.has(id)) mapa.set(id, { id, nome: Calc.atendente(id).nome, notas: [], aprovados: 0 });
      const item = mapa.get(id);
      item.notas.push(r.res.notaFinal);
      if (r.res.aprovado) item.aprovados++;
    });
    return [...mapa.values()]
      .map((i) => ({
        id: i.id,
        nome: i.nome,
        avaliacoes: i.notas.length,
        media: i.notas.reduce((s, n) => s + n, 0) / i.notas.length,
        pctAprovacao: (i.aprovados / i.notas.length) * 100,
        aprovados: i.aprovados,
      }))
      .sort((a, b2) => b2.media - a.media);
  },

  /** Média de cada critério, por CS — mostra onde cada um perde ponto. */
  criteriosPorAtendente(filtro) {
    const b = Metricas.base(filtro);
    const ids = [...new Set(b.map((r) => r.cs))];
    return ids
      .map((id) => {
        const meus = b.filter((r) => r.cs === id);
        return {
          id,
          nome: Calc.atendente(id).nome,
          n: meus.length,
          media: meus.reduce((s, r) => s + r.res.notaFinal, 0) / meus.length,
          criterios: CRITERIOS.map((c) => {
            const notas = meus.map((r) => r.av.notas[c.id]).filter((n) => typeof n === 'number');
            return {
              id: c.id,
              curto: c.curto || c.nome,
              media: notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : 0,
            };
          }),
        };
      })
      .sort((a, b2) => b2.media - a.media);
  },

  porCriterio(filtro) {
    const b = Metricas.base(filtro);
    return CRITERIOS.map((c) => {
      const notas = b.map((r) => r.av.notas[c.id]).filter((n) => typeof n === 'number');
      return {
        id: c.id,
        nome: c.nome,
        curto: c.curto || c.nome,
        media: notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : 0,
        n: notas.length,
      };
    }).sort((a, b2) => b2.media - a.media);
  },

  porContexto(filtro) {
    const b = Metricas.base(filtro);
    return CONTEXTOS.map((ctx) => {
      const itens = b.filter((r) => r.av.contexto === ctx.id);
      const notas = itens.map((r) => r.res.notaFinal);
      return {
        id: ctx.id,
        nome: ctx.nome,
        n: itens.length,
        media: notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : 0,
        aprovados: itens.filter((r) => r.res.aprovado).length,
      };
    }).filter((c) => c.n > 0);
  },

  /** Série por semana (segunda a domingo) — ignora o filtro de período. */
  evolucao(filtro) {
    const b = Metricas.base({ atendente: (filtro || {}).atendente, periodo: 'tudo' });
    const mapa = new Map();
    b.forEach((r) => {
      const d = Periodo.inicioDaSemana(r.quando);
      const chave = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
      if (!mapa.has(chave)) mapa.set(chave, { chave, data: d, notas: [] });
      mapa.get(chave).notas.push(r.res.notaFinal);
    });
    return [...mapa.values()]
      .sort((a, b2) => a.data - b2.data)
      .map((s) => ({
        chave: s.chave,
        data: s.data,
        n: s.notas.length,
        media: s.notas.reduce((x, n) => x + n, 0) / s.notas.length,
      }));
  },

  /** Corte mínimo exigido (fixo) — linha de referência dos gráficos. */
  corteMedio() {
    return CORTE_MINIMO;
  },
};

/* ============================================================
   Anexos — prints das conversas (uma LISTA por avaliação), em
   chave própria do localStorage: assim uma imagem grande nunca
   derruba a persistência das notas.
   ============================================================ */

const CHAVE_PRINTS = 'dionisio_qualidade_cs_prints_v1';

const Anexos = (function () {
  let mapa = {};
  let soMemoria = false;

  try {
    mapa = JSON.parse(localStorage.getItem(CHAVE_PRINTS) || '{}') || {};
  } catch (err) {
    mapa = {};
  }

  /** Formato antigo guardava um dataURL só: normaliza para lista. */
  function normalizar(v) {
    if (!v) return [];
    return Array.isArray(v) ? v.filter(Boolean) : [v];
  }

  function persistir() {
    try {
      localStorage.setItem(CHAVE_PRINTS, JSON.stringify(mapa));
      soMemoria = false;
      return true;
    } catch (err) {
      soMemoria = true;
      return false;
    }
  }

  return {
    /** Lista de prints de uma chave (id da avaliação, ticket ou rascunho). */
    lista: (chave) => normalizar(mapa[chave]).slice(),
    quantos: (chave) => normalizar(mapa[chave]).length,

    /** Acrescenta um print ao fim da lista. */
    adicionar(chave, dataURL) {
      const l = normalizar(mapa[chave]);
      l.push(dataURL);
      mapa[chave] = l;
      return persistir();
    },

    /** Remove só o print daquela posição. */
    removerEm(chave, indice) {
      const l = normalizar(mapa[chave]);
      l.splice(indice, 1);
      if (l.length) mapa[chave] = l;
      else delete mapa[chave];
      persistir();
    },

    /** Remove todos os prints daquela chave. */
    limparDe(chave) {
      delete mapa[chave];
      persistir();
    },

    /** Define a lista inteira de prints de uma chave. */
    definir(chave, lista) {
      const l = normalizar(lista);
      if (l.length) mapa[chave] = l;
      else delete mapa[chave];
      return persistir();
    },

    /** Troca todos os prints de uma vez (restaurar backup). */
    substituirTudo(novo) {
      mapa = novo && typeof novo === "object" ? novo : {};
      return persistir();
    },

    /** Passa os prints de uma chave para outra (rascunho → avaliação salva). */
    mover(de, para) {
      const l = normalizar(mapa[de]);
      if (!l.length) return;
      mapa[para] = l;
      delete mapa[de];
      persistir();
    },

    soMemoria: () => soMemoria,

    limpar() {
      mapa = {};
      persistir();
    },
  };
})();
