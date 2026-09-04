/* ============================================================
   relatorio.js — exporta o dashboard como UMA imagem

   É o relatório da semana pronto para copiar e colar. A leitura foi
   pensada de cima para baixo, do panorama ao detalhe:

     1. Faixa da marca ..... nota média do período em destaque
     2. Números do período .. avaliações, % dentro, abaixo, corte
     3. Como está o time .... ranking por CS, com pódio
     4. Onde ganha e perde .. média de cada critério, com o peso
     5. Cada pessoa ......... cartão por CS: nota, critérios,
                              ponto forte e ponto de atenção
     6. Avaliações .......... a lista caso a caso (só no individual)

   Respeita os filtros da tela (período e CS).

   As medidas, cores e fontes vêm de Exportar.util (js/exportar.js),
   então a imagem do relatório e a da avaliação são da mesma família.
   ============================================================ */

const Relatorio = (function () {
  const U = Exportar.util;
  const { PAD, LARG, C, F, quebrar, ret, txt } = U;

  /* --- paleta do relatório --- */
  const P = {
    marca: '#4a2b5e' /* faixa do topo */,
    roxo: '#7c3aed' /* barras neutras */,
    roxoClaro: '#ede5f5' /* trilho das barras */,
    verde: '#2e7d4f',
    verdeFundo: '#eaf5ee',
    vermelho: '#d4462b',
    vermelhoFundo: '#fdecea',
    ambar: '#e07a2f',
    ambarFundo: '#fdf3e3',
    linha: '#e6dcf0',
    rotulo: '#7a6a88',
    tinta: '#1c1c1c',
    tintaFraca: '#8b7a99',
    branco: '#ffffff',
    painel: '#faf7fc',
  };

  const H_RODAPE = 46;

  /* ---------------------------------------------------------------- */
  /* helpers de desenho                                                */
  /* ---------------------------------------------------------------- */

  /** Retângulo de cantos arredondados (com plano B onde não há roundRect). */
  function rr(ctx, x, y, w, h, r, fill, stroke) {
    const raio = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, raio);
    else {
      ctx.moveTo(x + raio, y);
      ctx.arcTo(x + w, y, x + w, y + h, raio);
      ctx.arcTo(x + w, y + h, x, y + h, raio);
      ctx.arcTo(x, y + h, x, y, raio);
      ctx.arcTo(x, y, x + w, y, raio);
      ctx.closePath();
    }
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  /** Pílula com texto — usada nas notas e nos pesos. */
  function chip(ctx, texto, x, y, cor, fundo, tamanho) {
    const t = tamanho || 12;
    ctx.font = F(t, '700');
    const w = ctx.measureText(texto).width + 18;
    const h = t + 12;
    rr(ctx, x, y, w, h, h / 2, fundo, null);
    txt(ctx, texto, x + 9, y + h - (h - t) / 2 - 2, F(t, '700'), cor);
    return w;
  }

  /** Título de seção: quadradinho colorido + título + dica à direita. */
  function secao(ctx, titulo, y, dica, cor) {
    rr(ctx, PAD, y + 2, 4, 14, 2, cor || P.roxo);
    txt(ctx, titulo.toUpperCase(), PAD + 14, y + 14, F(12, '700'), P.marca);
    if (dica) txt(ctx, dica, PAD + LARG, y + 14, F(11), P.tintaFraca, 'right');
    return 28;
  }

  /** Barra de 0 a 5 com trilho arredondado e marca do corte. */
  function barra(ctx, x, y, w, valor, corte, cor) {
    const h = 10;
    rr(ctx, x, y, w, h, h / 2, P.roxoClaro);
    const larg = Math.max(0, Math.min(1, valor / 5)) * w;
    if (larg > 1) rr(ctx, x, y, larg, h, h / 2, cor || P.roxo);
    const xc = x + (corte / 5) * w;
    ret(ctx, xc - 1, y - 4, 2, h + 8, P.ambar);
  }

  const corDaNota = (v, corte) => (v >= corte ? P.verde : P.vermelho);
  const fundoDaNota = (v, corte) => (v >= corte ? P.verdeFundo : P.vermelhoFundo);

  /* ---------------------------------------------------------------- */
  /* faixa do topo                                                     */
  /* ---------------------------------------------------------------- */

  const H_FAIXA = 150;

  function desenharFaixa(ctx, d) {
    const r = d.resumo;
    ret(ctx, 0, 0, U.W, H_FAIXA, P.marca);

    txt(ctx, 'RELATÓRIO DE QUALIDADE', PAD, 58, F(26, '700'), P.branco);
    txt(
      ctx,
      `${d.periodoRot}${d.intervalo ? '  ·  ' + d.intervalo : ''}`,
      PAD,
      84,
      F(14),
      'rgba(255,255,255,.72)'
    );
    txt(ctx, d.quem.toUpperCase(), PAD, 112, F(13, '700'), '#c9a9f0');

    /* cartão branco com a nota do período */
    const cw = 330;
    const ch = 116;
    const cx = U.W - PAD - cw;
    const cy = (H_FAIXA - ch) / 2;
    rr(ctx, cx, cy, cw, ch, 10, P.branco);

    if (r.total) {
      const dentro = r.media >= d.corte;
      txt(ctx, 'NOTA MÉDIA DO PERÍODO', cx + 20, cy + 26, F(10.5, '700'), P.rotulo);
      txt(ctx, UI.num(r.media, 2), cx + 20, cy + 66, F(40, '700'), P.marca);
      txt(ctx, 'de 5,00', cx + 20 + 118, cy + 66, F(13), P.tintaFraca);
      chip(
        ctx,
        dentro ? '✓ DENTRO DO ESPERADO' : '✗ ABAIXO DO ESPERADO',
        cx + 20,
        cy + 82,
        dentro ? P.verde : P.vermelho,
        dentro ? P.verdeFundo : P.vermelhoFundo,
        11
      );
    } else {
      txt(ctx, 'SEM AVALIAÇÕES', cx + 20, cy + 50, F(17, '700'), P.marca);
      txt(ctx, 'no período escolhido', cx + 20, cy + 74, F(13), P.tintaFraca);
    }
  }

  /* ---------------------------------------------------------------- */
  /* blocos                                                           */
  /* ---------------------------------------------------------------- */

  function blocoNumeros(d) {
    const r = d.resumo;
    const cards = [
      { rot: 'Avaliações', valor: String(r.total), dica: `${r.csAvaliados} CS avaliado(s)`, cor: P.roxo },
      {
        rot: 'Dentro do esperado',
        valor: r.total ? UI.pct(r.pctAprovacao, 0) : '—',
        dica: `${r.aprovados} de ${r.total}`,
        cor: P.verde,
      },
      {
        rot: 'Abaixo do esperado',
        valor: String(r.reprovados),
        dica: r.reprovados ? 'pedem feedback 1:1' : 'nenhum caso',
        cor: r.reprovados ? P.vermelho : P.linha,
      },
      { rot: 'Corte mínimo', valor: UI.num(d.corte, 1), dica: `Σ pesos ${d.somaPesos}`, cor: P.ambar },
    ];
    const h = 92;
    const gap = 14;
    const w = (LARG - gap * 3) / 4;

    return {
      h: h + 24,
      desenhar(ctx, y) {
        cards.forEach((c, i) => {
          const x = PAD + i * (w + gap);
          rr(ctx, x, y, w, h, 10, P.painel, P.linha);
          rr(ctx, x, y, w, 4, 2, c.cor);
          txt(ctx, c.rot.toUpperCase(), x + 16, y + 30, F(10.5, '700'), P.rotulo);
          txt(ctx, c.valor, x + 16, y + 66, F(30, '700'), P.marca);
          txt(ctx, c.dica, x + 16, y + 84, F(11), P.tintaFraca);
        });
      },
    };
  }

  const soUmaPessoa = (d) => !!d.mostrarItens;

  function blocoRanking(d) {
    const itens = d.porAtendente;
    if (!itens.length) return null;
    const hLinha = 44;

    return {
      h: 28 + itens.length * hLinha + 20,
      desenhar(ctx, y) {
        y += secao(ctx, 'Como está o time', y, '▍ a marca laranja é o corte mínimo', P.roxo);

        const xPos = PAD;
        const xNome = PAD + 40;
        const wNome = 170;
        const xBarra = xNome + wNome;
        const wBarra = LARG - 40 - wNome - 300;
        const xNota = xBarra + wBarra + 18;

        itens.forEach((a, i) => {
          const yy = y + i * hLinha;
          const dentro = a.media >= d.corte;

          /* pódio */
          rr(ctx, xPos, yy + 8, 24, 24, 12, i === 0 ? P.marca : P.painel, i === 0 ? null : P.linha);
          txt(
            ctx,
            String(i + 1),
            xPos + 12,
            yy + 25,
            F(12.5, '700'),
            i === 0 ? P.branco : P.rotulo,
            'center'
          );

          txt(ctx, a.nome, xNome, yy + 25, F(15, '600'), P.tinta);
          barra(ctx, xBarra, yy + 15, wBarra, a.media, d.corte, dentro ? P.verde : P.vermelho);
          txt(ctx, UI.num(a.media, 2), xNota, yy + 25, F(16, '700'), corDaNota(a.media, d.corte));
          txt(
            ctx,
            `${a.avaliacoes} avaliação(ões)  ·  ${UI.num(a.pctAprovacao, 0)}% dentro`,
            PAD + LARG,
            yy + 25,
            F(12),
            P.tintaFraca,
            'right'
          );
        });
      },
    };
  }

  function blocoCriterios(d) {
    const itens = d.porCriterio;
    if (!itens.length) return null;
    const hLinha = 40;
    const pior = itens.reduce((a, b) => (b.media < a.media ? b : a), itens[0]);

    return {
      h: 28 + itens.length * hLinha + 20,
      desenhar(ctx, y) {
        y += secao(
          ctx,
          soUmaPessoa(d) ? 'Onde ganha e onde perde ponto' : 'Onde o time ganha e onde perde ponto',
          y,
          'nota bruta em cada critério, antes do peso',
          P.roxo
        );

        const wNome = 250;
        const xBarra = PAD + wNome;
        const wBarra = LARG - wNome - 210;
        const xNota = xBarra + wBarra + 18;

        itens.forEach((c, i) => {
          const yy = y + i * hLinha;
          const ehPior = c.id === pior.id && itens.length > 1;

          if (ehPior) rr(ctx, PAD - 8, yy, LARG + 16, hLinha - 4, 8, P.ambarFundo);

          txt(ctx, c.curto, PAD, yy + 24, F(14, ehPior ? '700' : '600'), P.tinta);
          chip(ctx, 'peso ' + PESOS[c.id], PAD + wNome - 76, yy + 11, P.rotulo, P.linha, 10.5);
          barra(ctx, xBarra, yy + 15, wBarra, c.media, d.corte, ehPior ? P.ambar : P.roxo);
          txt(ctx, UI.num(c.media, 2), xNota, yy + 24, F(15, '700'), P.tinta);
          txt(
            ctx,
            ehPior ? 'ponto de atenção' : `${c.n} nota(s)`,
            PAD + LARG,
            yy + 24,
            F(11.5, ehPior ? '700' : ''),
            ehPior ? P.ambar : P.tintaFraca,
            'right'
          );
        });
      },
    };
  }

  /** Cartão de uma pessoa — dois por linha. */
  function cartaoMembro(ctx, m, d, x, y, w) {
    const hCrit = 24;
    const h = 118 + m.criterios.length * hCrit;
    const dentro = m.media >= d.corte;

    rr(ctx, x, y, w, h, 12, P.branco, P.linha);
    rr(ctx, x, y, 4, h, 2, dentro ? P.verde : P.vermelho);

    txt(ctx, m.nome, x + 20, y + 32, F(17, '700'), P.tinta);
    txt(ctx, `${m.n} avaliação(ões) no período`, x + 20, y + 52, F(11.5), P.tintaFraca);

    /* nota grande à direita */
    txt(ctx, UI.num(m.media, 2), x + w - 20, y + 40, F(30, '700'), corDaNota(m.media, d.corte), 'right');
    ctx.textAlign = 'left';
    const rot = dentro ? '✓ dentro' : '✗ abaixo';
    ctx.font = F(11, '700');
    const wc = ctx.measureText(rot).width + 18;
    chip(ctx, rot, x + w - 20 - wc, y + 48, dentro ? P.verde : P.vermelho, fundoDaNota(m.media, d.corte), 11);

    /* critérios */
    const xRot = x + 20;
    const wRot = 132;
    const xBarra = xRot + wRot;
    const wBarra = w - 40 - wRot - 42;

    m.criterios.forEach((c, i) => {
      const yy = y + 76 + i * hCrit;
      txt(ctx, c.curto, xRot, yy + 13, F(11.5), P.tintaFraca);
      barra(ctx, xBarra, yy + 4, wBarra, c.media, d.corte, P.roxo);
      txt(ctx, UI.num(c.media, 1), x + w - 20, yy + 13, F(12, '700'), P.tinta, 'right');
    });

    /* ponto forte e atenção */
    const ord = m.criterios.slice().sort((a, b) => b.media - a.media);
    const forte = ord[0];
    const fraco = ord[ord.length - 1];
    const yBase = y + 76 + m.criterios.length * hCrit + 14;
    if (forte && fraco && forte.id !== fraco.id) {
      txt(ctx, 'FORTE', xRot, yBase, F(9.5, '700'), P.verde);
      txt(ctx, forte.curto, xRot + 44, yBase, F(11.5), P.tinta);
      txt(ctx, 'ATENÇÃO', x + w / 2 + 6, yBase, F(9.5, '700'), P.ambar);
      txt(ctx, fraco.curto, x + w / 2 + 66, yBase, F(11.5), P.tinta);
    }

    return h;
  }

  function blocoMembros(d) {
    const lista = d.porMembro;
    if (!lista.length) return null;

    const gap = 14;
    const w = (LARG - gap) / 2;
    /* todos os cartões têm a mesma altura: usa o maior nº de critérios */
    const maxCrit = Math.max(...lista.map((m) => m.criterios.length));
    const hCartao = 118 + maxCrit * 24;
    const linhas = Math.ceil(lista.length / 2);

    return {
      h: 28 + linhas * (hCartao + gap) + 8,
      desenhar(ctx, y) {
        y += secao(ctx, 'Cada pessoa do time', y, 'nota da pessoa e média em cada critério', P.roxo);
        lista.forEach((m, i) => {
          const col = i % 2;
          const lin = Math.floor(i / 2);
          cartaoMembro(ctx, m, d, PAD + col * (w + gap), y + lin * (hCartao + gap), w);
        });
      },
    };
  }

  function blocoTabelaCabecalho() {
    const titulos = ['CS avaliado', 'Cliente / Loja', 'Atendimento', 'Nota', 'Veredito'];
    const COL = [170, 220, 462, 90, 190];
    return {
      COL,
      h: 28 + 36,
      desenhar(ctx, y) {
        y += secao(ctx, 'Avaliações do período', y, `${titulos.length ? '' : ''}`, P.roxo);
        rr(ctx, PAD, y, LARG, 36, 8, P.marca);
        let x = PAD;
        titulos.forEach((t, i) => {
          const centro = i >= 3;
          txt(
            ctx,
            t,
            centro ? x + COL[i] / 2 : x + 14,
            y + 23,
            F(11.5, '700'),
            P.branco,
            centro ? 'center' : 'left'
          );
          x += COL[i];
        });
      },
    };
  }

  function blocoLinhaTabela(med, item, COL, corte, indice) {
    const lAssunto = quebrar(med, item.assunto || '—', COL[2] - 28, F(13));
    const lLoja = quebrar(med, item.loja || '—', COL[1] - 28, F(13));
    const h = Math.max(48, 16 + Math.max(lAssunto.length * 18 + 18, lLoja.length * 18) + 12);

    return {
      h,
      desenhar(ctx, y) {
        if (indice % 2) ret(ctx, PAD, y, LARG, h, P.painel);
        ret(ctx, PAD, y + h - 1, LARG, 1, P.linha);

        let x = PAD;
        txt(ctx, item.cs, x + 14, y + 28, F(13.5, '600'), P.tinta);
        x += COL[0];
        lLoja.forEach((t, i) => txt(ctx, t, x + 14, y + 28 + i * 18, F(13), P.tinta));
        x += COL[1];
        lAssunto.forEach((t, i) => txt(ctx, t, x + 14, y + 28 + i * 18, F(13), P.tintaFraca));
        txt(ctx, item.classificacao, x + 14, y + 28 + lAssunto.length * 18, F(10.5, '700'), P.roxo);
        x += COL[2];
        txt(
          ctx,
          UI.num(item.nota, 2),
          x + COL[3] / 2,
          y + 29,
          F(15, '700'),
          item.aprovado ? P.verde : P.vermelho,
          'center'
        );
        x += COL[3];
        ctx.font = F(11, '700');
        const rot = item.aprovado ? '✓ Dentro' : '✗ Abaixo';
        const wc = ctx.measureText(rot).width + 18;
        chip(
          ctx,
          rot,
          x + (COL[4] - wc) / 2,
          y + 16,
          item.aprovado ? P.verde : P.vermelho,
          item.aprovado ? P.verdeFundo : P.vermelhoFundo,
          11
        );
      },
    };
  }

  function desenharRodape(ctx, d, y) {
    ret(ctx, PAD, y, LARG, 1, P.linha);
    const quem = d.avaliador ? 'Avaliações de ' + d.avaliador + '  ·  ' : '';
    txt(ctx, `${quem}Dionísio · Qualidade de Atendimento`, PAD, y + 22, F(11), P.tintaFraca);
    txt(
      ctx,
      `média ponderada · pesos ${CRITERIOS.map((c) => PESOS[c.id]).join('/')} · Σ ${
        d.somaPesos
      } · corte ${UI.num(d.corte, 1)}`,
      PAD + LARG,
      y + 22,
      F(11, '600'),
      P.tintaFraca,
      'right'
    );
  }

  /* ---------------------------------------------------------------- */
  /* composição                                                        */
  /* ---------------------------------------------------------------- */

  function compor(d) {
    const med = document.createElement('canvas').getContext('2d');
    const blocos = [blocoNumeros(d)];

    /* No relatório de uma pessoa só, o ranking teria uma linha e o cartão do
       membro repetiria os mesmos números dos critérios. Fica só o essencial. */
    const pecas = soUmaPessoa(d)
      ? [blocoCriterios(d)]
      : [blocoRanking(d), blocoCriterios(d), blocoMembros(d)];
    pecas.forEach((b) => {
      if (b) blocos.push(b);
    });

    /* a lista caso a caso é opcional: no relatório do time completo ela fica
       de fora, porque ali o que interessa é o panorama */
    if (d.mostrarItens) {
      if (d.itens.length) {
        const cab = blocoTabelaCabecalho();
        blocos.push(cab);
        d.itens.forEach((it, i) => blocos.push(blocoLinhaTabela(med, it, cab.COL, d.corte, i)));
        blocos.push({ h: 12, desenhar() {} });
      } else {
        blocos.push({
          h: 78,
          desenhar(ctx, y) {
            y += secao(ctx, 'Avaliações do período', y, '', P.roxo);
            rr(ctx, PAD, y, LARG, 42, 8, P.painel, P.linha);
            txt(ctx, 'Nenhuma avaliação registrada neste período.', PAD + 16, y + 27, F(13.5), P.tintaFraca);
          },
        });
      }
    }

    const conteudo = blocos.reduce((s, b) => s + b.h, 0);
    const H = H_FAIXA + 26 + conteudo + 8 + H_RODAPE + PAD;

    const { canvas, ctx } = U.novoCanvas(H);
    desenharFaixa(ctx, d);

    let y = H_FAIXA + 26;
    blocos.forEach((b) => {
      b.desenhar(ctx, y);
      y += b.h;
    });

    desenharRodape(ctx, d, y + 8);
    return canvas;
  }

  function slug(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function nomeArquivo(d) {
    return `relatorio-qualidade-${slug(d.periodoRot) || 'periodo'}-${slug(d.quem) || 'time'}.png`;
  }

  return {
    compor,
    nomeArquivo,
    copiar: (d) => U.copiarCanvas(compor(d)),
    baixar: (d) => U.baixarCanvas(compor(d), nomeArquivo(d)),
    abrir: (d) => U.abrirCanvas(compor(d), 'Relatório de Qualidade'),
  };
})();
