/* ============================================================
   exportar.js — compõe a avaliação em UMA imagem (canvas puro)

   Uma imagem só, com a ficha e a conversa juntas, feita para
   copiar e colar (Ctrl+C → Ctrl+V). A ordem é:

     1. Cabeçalho ....... título + selo com a nota e o veredito
     2. Assunto ......... o que o cliente procurou
     3. Identificação ... CS avaliado, loja, canal, classificação
     4. Critérios ....... peso × nota = ponderado, + TEMPO e TOTAIS
     5. Resultado ....... nota final | corte | veredito + o cálculo
     6. Observações ..... feedback ao CS
     7. Conversa ........ os prints, numerados, em largura cheia

   Largura fixa de 2480 px (a mesma de uma folha A4 a 300 dpi) e
   altura livre: cresce conforme o número de prints.

   Sem biblioteca: tudo desenhado em <canvas> e exportado em PNG.
   ============================================================ */

const Exportar = (function () {
  /* medidas lógicas; ESC = 2 dobra tudo na saída (imagem nítida) */
  const W = 1240;
  const ESC = 2;
  const PAD = 54;
  const LARG = W - 2 * PAD; /* 1132 */
  const COL = [370, 390, 86, 132, 154]; /* colunas da tabela — soma = 1132 */

  const C = {
    borda: '#4a2b5e',
    bordaLeve: '#c3b0d1',
    grupo: '#ded0e8',
    grupoTxt: '#5b2d78',
    branco: '#ffffff',
    fundo: '#ffffff',
    painel: '#faf7fc',
    txt: '#1c1c1c',
    obs: '#8b7a99',
    creme: '#fdf3d5',
    totais: '#d9c9e5',
    headBg: '#4a2b5e',
    headTxt: '#ffffff',
    notaBox: '#f3edf8',
    ok: '#2e7d4f',
    ruim: '#d4462b',
    cinza: '#6b6b6b',
    rotulo: '#7a6a88',
  };

  const F = (px, peso) =>
    `${peso ? peso + ' ' : ''}${px}px "Segoe UI", system-ui, -apple-system, Arial, sans-serif`;

  /* ---------------------------------------------------------------- */
  /* helpers de desenho                                                */
  /* ---------------------------------------------------------------- */

  function quebrar(ctx, texto, maxW, font) {
    ctx.font = font;
    const palavras = String(texto == null ? '' : texto).split(/\s+/).filter(Boolean);
    if (!palavras.length) return [''];
    const linhas = [];
    let atual = '';
    palavras.forEach((p) => {
      const teste = atual ? atual + ' ' + p : p;
      if (ctx.measureText(teste).width <= maxW || !atual) atual = teste;
      else {
        linhas.push(atual);
        atual = p;
      }
    });
    if (atual) linhas.push(atual);
    return linhas;
  }

  function ret(ctx, x, y, w, h, fill, stroke) {
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
  }

  function txt(ctx, s, x, y, font, cor, align) {
    ctx.font = font;
    ctx.fillStyle = cor;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(s == null ? '' : s), x, y);
    ctx.textAlign = 'left';
  }

  function linhaV(ctx, x, y, h, cor) {
    ctx.strokeStyle = cor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, y);
    ctx.lineTo(x + 0.5, y + h);
    ctx.stroke();
  }

  function colX(i) {
    let x = PAD;
    for (let k = 0; k < i; k++) x += COL[k];
    return x;
  }

  function carregarImagem(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  /* ---------------------------------------------------------------- */
  /* entrada: aceita o formato novo (campos soltos) e o antigo         */
  /* (dados.ticket), para as duas telas continuarem funcionando        */
  /* ---------------------------------------------------------------- */

  function normalizar(d) {
    const t = d.ticket || {};
    const prints = Array.isArray(d.prints) ? d.prints.filter(Boolean) : d.print ? [d.print] : [];
    return {
      cs: d.cs || t.atendente || '',
      loja: d.loja || t.loja || '',
      canal: d.canal || t.canal || '',
      assunto: d.assunto || t.assunto || '',
      ticketId: d.ticketId || t.id || '',
      contato: d.contato || t.contato || '',
      primeiraRespostaMin: d.primeiraRespostaMin ?? t.primeiraRespostaMin ?? null,
      duracaoMin: d.duracaoMin ?? t.duracaoMin ?? null,
      contexto: d.contexto,
      res: d.res,
      observacoes: d.observacoes || '',
      avaliador: d.avaliador || '',
      prints,
    };
  }

  /** Só entra na identificação o que realmente foi informado. */
  function camposIdentificacao(v) {
    const campos = [];
    const por = (rotulo, valor) => {
      const s = valor == null ? '' : String(valor).trim();
      if (s && s !== '—') campos.push([rotulo, s]);
    };
    por('CS avaliado', Calc.atendente(v.cs).nome);
    por('Cliente / Loja', v.loja);
    por('Canal', v.canal);
    por('Classificação', Calc.contexto(v.contexto).nome);
    por('Ticket', v.ticketId);
    por('Contato', v.contato);
    por('Avaliador', v.avaliador);
    return campos;
  }

  function textoTempo(v) {
    const p = [];
    if (v.primeiraRespostaMin != null && v.primeiraRespostaMin !== '')
      p.push(`1ª resposta em ${v.primeiraRespostaMin} min`);
    if (v.duracaoMin != null && v.duracaoMin !== '') p.push(`duração total ${v.duracaoMin} min`);
    return p.length ? p.join(' · ') : 'Tempos não informados';
  }

  /* ---------------------------------------------------------------- */
  /* cabeçalho e rodapé                                                */
  /* ---------------------------------------------------------------- */

  const H_CABECALHO = 104;
  const H_RODAPE = 44;

  function desenharCabecalho(ctx, v) {
    const res = v.res;
    const y = PAD;

    txt(ctx, 'AVALIAÇÃO DE ATENDIMENTO', PAD, y + 30, F(23, '700'), C.headBg);
    txt(ctx, 'Dionísio · Qualidade de CS', PAD, y + 52, F(13), C.cinza);

    const selW = 340;
    const selH = 66;
    const selX = PAD + LARG - selW;
    const cor = !res.completo ? C.cinza : res.aprovado ? C.ok : C.ruim;
    ret(ctx, selX, y, selW, selH, cor);
    if (res.completo) {
      txt(ctx, UI.num(res.notaFinal, 2), selX + 18, y + 34, F(28, '700'), C.branco);
      txt(ctx, 'de 5,00', selX + 18 + 92, y + 34, F(13), 'rgba(255,255,255,.85)');
      txt(
        ctx,
        (res.aprovado ? '✓ ' : '✗ ') + (res.aprovado ? 'DENTRO DO ESPERADO' : 'ABAIXO DO ESPERADO'),
        selX + 18,
        y + 55,
        F(13, '700'),
        C.branco
      );
    } else {
      txt(ctx, 'AVALIAÇÃO INCOMPLETA', selX + 18, y + 30, F(15, '700'), C.branco);
      txt(
        ctx,
        `${res.preenchidos} de ${res.totalCriterios} critérios com nota`,
        selX + 18,
        y + 50,
        F(12.5),
        'rgba(255,255,255,.9)'
      );
    }

    ret(ctx, PAD, y + 84, LARG, 2, C.headBg);
  }

  function desenharRodape(ctx, v, y) {
    ret(ctx, PAD, y, LARG, 1, C.bordaLeve);
    const quem = v.avaliador ? 'Avaliado por ' + v.avaliador + ' · ' : '';
    txt(ctx, `${quem}Dionísio · Qualidade de Atendimento`, PAD, y + 20, F(11), C.obs);
    txt(
      ctx,
      `pesos fixos ${CRITERIOS.map((c) => PESOS[c.id]).join('/')} · Σ ${CRITERIOS.reduce(
        (s, c) => s + PESOS[c.id],
        0
      )} · corte ${UI.num(CORTE_MINIMO, 1)}`,
      PAD + LARG,
      y + 20,
      F(11, '600'),
      C.obs,
      'right'
    );
  }

  /* ---------------------------------------------------------------- */
  /* blocos de conteúdo — cada um sabe a própria altura                */
  /* ---------------------------------------------------------------- */

  function tituloSecao(ctx, texto, y) {
    txt(ctx, texto.toUpperCase(), PAD, y + 13, F(11.5, '700'), C.grupoTxt);
    return 22;
  }

  function blocoAssunto(med, v) {
    const linhas = quebrar(med, v.assunto || 'Avaliação de atendimento', LARG - 28, F(16, '600'));
    const hCaixa = 18 + linhas.length * 24;
    return {
      h: 22 + hCaixa + 16,
      desenhar(ctx, y) {
        y += tituloSecao(ctx, 'Assunto do atendimento', y);
        ret(ctx, PAD, y, LARG, hCaixa, C.painel, C.bordaLeve);
        linhas.forEach((t, i) => txt(ctx, t, PAD + 14, y + 26 + i * 24, F(16, '600'), C.txt));
      },
    };
  }

  function blocoIdentificacao(med, v) {
    const campos = camposIdentificacao(v);
    const meia = LARG / 2;
    const largRot = 108;
    const largVal = meia - largRot - 18;

    const pares = [];
    for (let i = 0; i < campos.length; i += 2) {
      const a = campos[i];
      const b = campos[i + 1];
      const la = quebrar(med, a[1], largVal, F(13.5));
      const lb = b ? quebrar(med, b[1], largVal, F(13.5)) : [];
      pares.push({ a, b, la, lb, h: Math.max(la.length, lb.length || 1) * 19 + 7 });
    }
    const hGrade = pares.reduce((s, p) => s + p.h, 0) + 10;

    return {
      h: 22 + hGrade + 16,
      desenhar(ctx, y) {
        y += tituloSecao(ctx, 'Identificação', y);
        let yy = y + 4;
        pares.forEach((p) => {
          const campo = (c, linhas, x) => {
            if (!c) return;
            txt(ctx, c[0], x, yy + 14, F(11), C.rotulo);
            linhas.forEach((t, i) => txt(ctx, t, x + largRot, yy + 14 + i * 19, F(13.5), C.txt));
          };
          campo(p.a, p.la, PAD);
          campo(p.b, p.lb, PAD + meia);
          yy += p.h;
        });
      },
    };
  }

  function blocoCabecalhoTabela() {
    const titulos = ['CRITÉRIO', 'O que observar · nota atribuída', 'Peso', 'Nota (0–5)', 'Ponderado'];
    return {
      h: 22 + 40,
      desenhar(ctx, y) {
        y += tituloSecao(ctx, 'Critérios avaliados', y);
        ret(ctx, PAD, y, LARG, 40, C.headBg);
        titulos.forEach((t, i) => {
          const centro = i >= 2;
          txt(
            ctx,
            t,
            centro ? colX(i) + COL[i] / 2 : colX(i) + 12,
            y + 26,
            F(12, '700'),
            C.headTxt,
            centro ? 'center' : 'left'
          );
        });
      },
    };
  }

  function blocoGrupo(nome) {
    return {
      h: 30,
      desenhar(ctx, y) {
        ret(ctx, PAD, y, LARG, 30, C.grupo, C.bordaLeve);
        txt(ctx, nome.toUpperCase(), PAD + 12, y + 20, F(11.5, '700'), C.grupoTxt);
      },
    };
  }

  function blocoCriterio(med, c, linha) {
    const l1 = quebrar(med, c.nome, COL[0] - 24, F(15, '600'));
    const l2 = quebrar(med, c.observar, COL[1] - 24, F(13));
    const temNota = linha && linha.nota !== null;
    const l3 = temNota
      ? quebrar(
          med,
          `Nota ${UI.nota(linha.nota)}: ${(c.escala || {})[linha.nota] || '—'}`,
          COL[1] - 24,
          F(12.5, '600')
        )
      : [];
    const h = Math.max(
      54,
      22 + Math.max(l1.length * 20, l2.length * 17 + (l3.length ? l3.length * 16 + 7 : 0))
    );

    return {
      h,
      desenhar(ctx, y) {
        ret(ctx, PAD, y, LARG, h, C.branco, C.bordaLeve);
        for (let i = 1; i < COL.length; i++) linhaV(ctx, colX(i), y, h, C.bordaLeve);

        l1.forEach((t, i) => txt(ctx, t, PAD + 12, y + 26 + i * 20, F(15, '600'), C.txt));
        l2.forEach((t, i) => txt(ctx, t, colX(1) + 12, y + 24 + i * 17, F(13), C.obs));
        l3.forEach((t, i) =>
          txt(ctx, t, colX(1) + 12, y + 24 + l2.length * 17 + 13 + i * 16, F(12.5, '600'), C.grupoTxt)
        );

        const meio = y + h / 2 + 6;
        txt(ctx, String(linha.peso), colX(2) + COL[2] / 2, meio, F(15, '600'), C.txt, 'center');

        const cx = colX(3) + COL[3] / 2;
        if (temNota) {
          ret(ctx, cx - 30, y + h / 2 - 17, 60, 34, C.creme, C.borda);
          txt(ctx, UI.nota(linha.nota), cx, meio, F(17, '700'), C.txt, 'center');
        } else {
          txt(ctx, '—', cx, meio, F(15), C.obs, 'center');
        }

        txt(
          ctx,
          temNota ? UI.num(linha.ponderado, 1) : '—',
          colX(4) + COL[4] / 2,
          meio,
          F(15, temNota ? '600' : ''),
          temNota ? C.txt : C.obs,
          'center'
        );
      },
    };
  }

  function blocoTempo(v) {
    const h = 36;
    return {
      h,
      desenhar(ctx, y) {
        ret(ctx, PAD, y, LARG, h, C.painel, C.bordaLeve);
        for (let i = 1; i < COL.length; i++) linhaV(ctx, colX(i), y, h, C.bordaLeve);
        txt(ctx, textoTempo(v), PAD + 12, y + 23, F(13), C.obs);
        txt(ctx, '—', colX(2) + COL[2] / 2, y + 23, F(13), C.obs, 'center');
        txt(ctx, 'informativo', colX(3) + COL[3] / 2, y + 23, F(11.5), C.obs, 'center');
        txt(ctx, '—', colX(4) + COL[4] / 2, y + 23, F(13), C.obs, 'center');
      },
    };
  }

  function blocoTotais(v) {
    const res = v.res;
    const h = 40;
    return {
      h: h + 16,
      desenhar(ctx, y) {
        ret(ctx, PAD, y, LARG, h, C.totais, C.borda);
        for (let i = 1; i < COL.length; i++) linhaV(ctx, colX(i), y, h, C.borda);
        txt(ctx, 'TOTAIS', PAD + 12, y + 26, F(13.5, '700'), C.grupoTxt);
        txt(
          ctx,
          `${res.preenchidos} de ${res.totalCriterios} critérios com nota`,
          colX(1) + 12,
          y + 26,
          F(12.5),
          C.grupoTxt
        );
        txt(ctx, String(res.somaPesos), colX(2) + COL[2] / 2, y + 26, F(15, '700'), C.txt, 'center');
        txt(
          ctx,
          UI.num(res.somaPonderada, 1),
          colX(4) + COL[4] / 2,
          y + 26,
          F(15, '700'),
          C.txt,
          'center'
        );
      },
    };
  }

  function blocoResultado(v) {
    const res = v.res;
    const hCel = 84;
    return {
      h: 22 + hCel + 26 + 16,
      desenhar(ctx, y) {
        y += tituloSecao(ctx, 'Resultado', y);

        const l1 = Math.round(LARG * 0.3);
        const l2 = Math.round(LARG * 0.26);
        const l3 = LARG - l1 - l2;

        ret(ctx, PAD, y, l1, hCel, C.notaBox, C.borda);
        txt(ctx, 'NOTA FINAL (0–5)', PAD + 16, y + 22, F(11, '700'), C.rotulo);
        txt(ctx, res.completo ? UI.num(res.notaFinal, 2) : '—', PAD + 16, y + 66, F(38, '700'), C.headBg);

        const x2 = PAD + l1;
        ret(ctx, x2, y, l2, hCel, C.branco, C.borda);
        txt(ctx, 'CORTE MÍNIMO', x2 + 16, y + 22, F(11, '700'), C.rotulo);
        txt(ctx, UI.num(res.corte, 1), x2 + 16, y + 62, F(30, '700'), C.txt);
        txt(ctx, 'exigido', x2 + 16 + 62, y + 62, F(12), C.obs);

        const x3 = x2 + l2;
        const cor = !res.completo ? C.cinza : res.aprovado ? C.ok : C.ruim;
        ret(ctx, x3, y, l3, hCel, cor);
        txt(ctx, 'VEREDITO', x3 + 16, y + 22, F(11, '700'), 'rgba(255,255,255,.85)');
        txt(
          ctx,
          !res.completo ? 'INCOMPLETA' : res.aprovado ? '✓ DENTRO DO ESPERADO' : '✗ ABAIXO DO ESPERADO',
          x3 + 16,
          y + 60,
          F(20, '700'),
          C.branco
        );

        txt(
          ctx,
          `Cálculo: Σ ponderado ${UI.num(res.somaPonderada, 1)} ÷ Σ pesos ${res.somaPesos} = ${
            res.completo ? UI.num(res.notaFinal, 2) : '—'
          }   ·   ${res.preenchidos}/${res.totalCriterios} critérios avaliados`,
          PAD,
          y + hCel + 20,
          F(12),
          C.obs
        );
      },
    };
  }

  function blocoObservacoes(med, v) {
    const linhas = quebrar(med, v.observacoes || 'Sem observações registradas.', LARG - 28, F(13.5));
    const hCaixa = 16 + linhas.length * 20;
    return {
      h: 22 + hCaixa + 16,
      desenhar(ctx, y) {
        y += tituloSecao(ctx, 'Observações / feedback ao CS', y);
        ret(ctx, PAD, y, LARG, hCaixa, C.painel, C.bordaLeve);
        linhas.forEach((t, i) => txt(ctx, t, PAD + 14, y + 26 + i * 20, F(13.5), C.txt));
      },
    };
  }

  /** Um print da conversa, em largura cheia. */
  function blocoPrint(img, indice, total) {
    const hTitulo = 22;
    const w = LARG;
    const h = (img.height * LARG) / img.width;

    return {
      h: hTitulo + h + 14,
      desenhar(ctx, y) {
        y += tituloSecao(
          ctx,
          total > 1 ? `Conversa avaliada · print ${indice} de ${total}` : 'Conversa avaliada',
          y
        );
        ret(ctx, PAD - 1, y - 1, w + 2, h + 2, null, C.bordaLeve);
        ctx.drawImage(img, PAD, y, w, h);
      },
    };
  }

  /* ---------------------------------------------------------------- */
  /* composição — tudo numa imagem só                                  */
  /* ---------------------------------------------------------------- */

  async function compor(dados) {
    const v = normalizar(dados);
    const med = document.createElement('canvas').getContext('2d');

    const imgs = [];
    for (const src of v.prints) {
      const img = await carregarImagem(src);
      if (img) imgs.push(img);
    }

    /* --- pilha de blocos --- */
    const blocos = [blocoAssunto(med, v), blocoIdentificacao(med, v), blocoCabecalhoTabela()];

    GRUPOS_CRITERIOS.forEach((g) => {
      blocos.push(blocoGrupo(g.nome));
      g.criterios.forEach((c) => {
        const linha =
          v.res.linhas.find((l) => l.id === c.id) || { peso: PESOS[c.id], nota: null, ponderado: 0 };
        blocos.push(blocoCriterio(med, c, linha));
      });
    });
    blocos.push(blocoGrupo('Tempo'), blocoTempo(v), blocoTotais(v));
    blocos.push(blocoResultado(v));
    blocos.push(blocoObservacoes(med, v));
    imgs.forEach((img, i) => blocos.push(blocoPrint(img, i + 1, imgs.length)));

    /* --- altura total --- */
    const conteudo = blocos.reduce((s, b) => s + b.h, 0);
    const H = PAD + H_CABECALHO + conteudo + 10 + H_RODAPE + PAD;

    /* --- desenha --- */
    const canvas = document.createElement('canvas');
    canvas.width = W * ESC;
    canvas.height = Math.round(H) * ESC;
    const ctx = canvas.getContext('2d');
    ctx.scale(ESC, ESC);
    ctx.fillStyle = C.fundo;
    ctx.fillRect(0, 0, W, H);

    desenharCabecalho(ctx, v);

    let y = PAD + H_CABECALHO;
    blocos.forEach((b) => {
      b.desenhar(ctx, y);
      y += b.h;
    });

    desenharRodape(ctx, v, y + 10);

    return canvas;
  }

  /* compatibilidade: quem pedia páginas recebe a imagem única numa lista */
  async function paginas(dados) {
    return [await compor(dados)];
  }

  function nomeArquivo(dados) {
    const v = normalizar(dados);
    const cs = (Calc.atendente(v.cs).nome || 'cs')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const loja = (v.loja || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `avaliacao-${cs || 'cs'}${loja ? '-' + loja : ''}.png`;
  }

  function paraBlob(canvas) {
    return new Promise((r) => canvas.toBlob(r, 'image/png'));
  }

  /* ---------------------------------------------------------------- */
  /* saídas                                                            */
  /* ---------------------------------------------------------------- */

  /** Copia a imagem inteira para a área de transferência. */
  async function copiar(dados) {
    const canvas = await compor(dados);
    const blob = await paraBlob(canvas);
    if (!navigator.clipboard || !window.ClipboardItem) throw new Error('sem-clipboard');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return 1;
  }

  /** Baixa a imagem inteira num PNG só. */
  async function baixar(dados) {
    const canvas = await compor(dados);
    const blob = await paraBlob(canvas);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo(dados);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 1;
  }

  /** Abre a imagem numa aba nova. */
  async function abrir(dados) {
    const canvas = await compor(dados);
    const aba = window.open('', '_blank');
    if (!aba) return 0;
    aba.document.write(
      `<!doctype html><meta charset="utf-8"><title>Avaliação de atendimento</title>` +
        `<style>body{margin:0;padding:24px;background:#2b2b33;font:14px/1.5 "Segoe UI",system-ui,sans-serif;color:#ddd}` +
        `p{margin:0 auto 10px;max-width:900px;font-size:12.5px;color:#aaa}` +
        `img{width:100%;max-width:900px;height:auto;display:block;margin:0 auto;` +
        `box-shadow:0 6px 24px rgba(0,0,0,.5);background:#fff}</style>` +
        `<p>Imagem única — ${canvas.width} × ${canvas.height} px. Clique com o botão direito para copiar.</p>` +
        `<img src="${canvas.toDataURL('image/png')}" alt="Avaliação de atendimento">`
    );
    aba.document.close();
    return 1;
  }

  /* ---------------------------------------------------------------- */
  /* caixa de ferramentas: o relatório do dashboard (js/relatorio.js)  */
  /* desenha com as mesmas medidas, cores e fontes daqui              */
  /* ---------------------------------------------------------------- */

  const util = {
    W,
    PAD,
    LARG,
    ESC,
    C,
    F,
    quebrar,
    ret,
    txt,
    linhaV,
    paraBlob,

    /** Canvas branco na largura padrão e na altura pedida. */
    novoCanvas(altura) {
      const canvas = document.createElement('canvas');
      canvas.width = W * ESC;
      canvas.height = Math.round(altura) * ESC;
      const ctx = canvas.getContext('2d');
      ctx.scale(ESC, ESC);
      ctx.fillStyle = C.fundo;
      ctx.fillRect(0, 0, W, altura);
      return { canvas, ctx };
    },

    async copiarCanvas(canvas) {
      const blob = await paraBlob(canvas);
      if (!navigator.clipboard || !window.ClipboardItem) throw new Error('sem-clipboard');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return 1;
    },

    async baixarCanvas(canvas, nome) {
      const blob = await paraBlob(canvas);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return 1;
    },

    abrirCanvas(canvas, titulo) {
      const aba = window.open('', '_blank');
      if (!aba) return 0;
      aba.document.write(
        `<!doctype html><meta charset="utf-8"><title>${titulo}</title>` +
          `<style>body{margin:0;padding:24px;background:#2b2b33;font:14px/1.5 "Segoe UI",system-ui,sans-serif;color:#ddd}` +
          `p{margin:0 auto 10px;max-width:900px;font-size:12.5px;color:#aaa}` +
          `img{width:100%;max-width:900px;height:auto;display:block;margin:0 auto;` +
          `box-shadow:0 6px 24px rgba(0,0,0,.5);background:#fff}</style>` +
          `<p>${titulo} — ${canvas.width} × ${canvas.height} px. Clique com o botão direito para copiar.</p>` +
          `<img src="${canvas.toDataURL('image/png')}" alt="${titulo}">`
      );
      aba.document.close();
      return 1;
    },
  };

  return { compor, paginas, copiar, baixar, abrir, nomeArquivo, util };
})();
