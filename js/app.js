/* ============================================================
   app.js — roteador por hash e inicialização
   #/dashboard · #/calculadora · #/calculadora/AV-003 · #/historico
   ============================================================ */

const App = (function () {
  const root = () => document.getElementById('conteudo');

  function ir(rota) {
    location.hash = '#/' + rota.replace(/^#?\/?/, '');
  }

  function marcarNav(rotaBase) {
    UI.qq('.nav-item').forEach((b) =>
      b.classList.toggle('ativo', b.dataset.rota === rotaBase)
    );
  }

  /* o badge mostra quantas avaliações já estão registradas */
  function atualizarBadge() {
    const total = Estado.avaliacoes().length;
    const el = document.getElementById('badgePendentes');
    if (!el) return;
    el.textContent = total;
    el.dataset.zero = total === 0 ? '1' : '0';
  }

  /* ---------- indicador do banco de dados ---------- */
  const ROTULOS = {
    desligada: ['só neste navegador', 'cinza'],
    sincronizando: ['sincronizando…', 'sync'],
    ok: ['banco sincronizado', 'ok'],
    fila: ['aguardando internet', 'espera'],
    erro: ['falha ao sincronizar', 'erro'],
  };

  function pintarSync(sit, chegouDadoNovo) {
    const bola = document.getElementById('syncBola');
    const txt = document.getElementById('syncTxt');
    if (!bola || !txt) return;

    const [rot, cor] = ROTULOS[sit.estado] || ROTULOS.desligada;
    bola.dataset.cor = cor;
    txt.textContent = sit.pendentes ? `${rot} (${sit.pendentes})` : rot;
    document.getElementById('sync').title = sit.erro
      ? 'Erro: ' + sit.erro
      : sit.estado === 'desligada'
      ? 'Sem banco configurado: as avaliações ficam só neste navegador. Veja apps_script.js.'
      : 'Clique para sincronizar agora';

    /* chegou coisa nova da planilha: redesenha a tela atual */
    if (chegouDadoNovo) {
      render();
      UI.toast('Avaliações do time atualizadas.');
    }
  }

  function render() {
    const hash = location.hash.replace(/^#\/?/, '') || 'dashboard';
    const [rota, param] = hash.split('/');
    const el = root();
    el.scrollTop = 0;

    switch (rota) {
      case 'dashboard':
        marcarNav('dashboard');
        TelaDashboard.montar(el);
        break;
      case 'calculadora':
        marcarNav('calculadora');
        TelaCalculadora.montar(el, param);
        break;
      case 'historico':
        marcarNav('historico');
        TelaHistorico.montar(el);
        break;
      case 'avaliar':
        marcarNav('tickets');
        TelaAvaliacao.montar(el, param);
        break;
      case 'tickets':
        marcarNav('tickets');
        TelaTickets.montar(el);
        break;
      case 'dashboard-inicial':
      default:
        marcarNav('dashboard');
        TelaDashboard.montar(el);
    }
    atualizarBadge();
  }

  function init() {
    Estado.init();
    Nuvem.iniciar(pintarSync);
    const btnSync = document.getElementById('sync');
    if (btnSync)
      btnSync.addEventListener('click', async () => {
        if (!Nuvem.configurada()) {
          UI.toast('Banco não configurado ainda — o passo a passo está em apps_script.js.', true);
          return;
        }
        const r = await Nuvem.sincronizar();
        if (r.ok) {
          if (r.mudou) render();
          UI.toast(r.mudou ? 'Atualizado com a planilha.' : 'Tudo em dia com a planilha.');
        } else {
          UI.toast('Não consegui falar com a planilha: ' + (r.erro || r.motivo), true);
        }
      });
    UI.qq('.nav-item').forEach((b) => b.addEventListener('click', () => ir(b.dataset.rota)));
    window.addEventListener('hashchange', render);
    if (!location.hash) location.hash = '#/dashboard';
    render();
  }

  return { init, ir, render, atualizarBadge };
})();

document.addEventListener('DOMContentLoaded', App.init);
