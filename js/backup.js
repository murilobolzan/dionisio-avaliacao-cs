/* ============================================================
   backup.js — cópia de segurança das avaliações em arquivo

   As avaliações ficam guardadas no navegador (localStorage). Isso
   sobrevive a fechar a aba, fechar o navegador e reiniciar o PC —
   mas fica preso ao ENDEREÇO em que o app foi aberto e ao navegador
   daquele computador.

   Por isso existe o backup: um arquivo .json com TUDO (avaliações
   e prints) que você guarda no Drive e restaura em qualquer lugar.
   ============================================================ */

const Backup = (function () {
  const VERSAO = 1;

  function hoje() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /** Tudo que precisa ser preservado, num objeto só. */
  function montar() {
    const avaliacoes = Estado.avaliacoes();
    const prints = {};
    avaliacoes.forEach((a) => {
      const lista = Anexos.lista(a.id);
      if (lista.length) prints[a.id] = lista;
    });
    return {
      formato: 'dionisio-qualidade-cs',
      versao: VERSAO,
      geradoEm: new Date().toISOString(),
      origem: location.origin,
      avaliacoes,
      prints,
    };
  }

  /** Quanto espaço as avaliações e os prints estão ocupando. */
  function resumo() {
    const avaliacoes = Estado.avaliacoes();
    const comPrints = avaliacoes.filter((a) => Anexos.quantos(a.id) > 0).length;
    const totalPrints = avaliacoes.reduce((s, a) => s + Anexos.quantos(a.id), 0);

    let bytes = 0;
    try {
      bytes =
        (localStorage.getItem(CHAVE) || '').length +
        (localStorage.getItem(CHAVE_PRINTS) || '').length;
    } catch (e) {
      /* sem acesso ao storage: segue com zero */
    }

    return {
      avaliacoes: avaliacoes.length,
      comPrints,
      totalPrints,
      mb: Math.round((bytes / 1048576) * 10) / 10,
    };
  }

  /** Baixa o arquivo de backup. */
  function exportar() {
    const dados = montar();
    const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-avaliacoes-cs-${hoje()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return dados.avaliacoes.length;
  }

  function lerArquivo(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ''));
      fr.onerror = () => reject(new Error('leitura'));
      fr.readAsText(file);
    });
  }

  /**
   * Restaura um backup.
   * @param {File}   file
   * @param {String} modo 'juntar' (padrão) ou 'substituir'
   */
  async function importar(file, modo) {
    const texto = await lerArquivo(file);

    let dados;
    try {
      dados = JSON.parse(texto);
    } catch (e) {
      throw new Error('Arquivo inválido: não é um backup em JSON.');
    }
    if (!dados || dados.formato !== 'dionisio-qualidade-cs' || !Array.isArray(dados.avaliacoes)) {
      throw new Error('Este arquivo não é um backup deste app.');
    }

    const prints = dados.prints || {};

    if (modo === 'substituir') {
      Estado.substituirTudo(dados.avaliacoes);
      Anexos.substituirTudo(prints);
      return { modo, adicionadas: dados.avaliacoes.length, ignoradas: 0 };
    }

    /* juntar: o que já existe (mesmo id) não é sobrescrito */
    const atuais = Estado.avaliacoes();
    const existentes = new Set(atuais.map((a) => a.id));
    const novas = dados.avaliacoes.filter((a) => !existentes.has(a.id));

    Estado.substituirTudo(atuais.concat(novas));
    novas.forEach((a) => {
      if (prints[a.id]) Anexos.definir(a.id, prints[a.id]);
    });

    return {
      modo: 'juntar',
      adicionadas: novas.length,
      ignoradas: dados.avaliacoes.length - novas.length,
    };
  }

  return { exportar, importar, resumo, montar };
})();
