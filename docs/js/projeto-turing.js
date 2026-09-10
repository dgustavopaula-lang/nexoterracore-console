(() => {
  "use strict";

  const MARKET_API = "https://api.binance.com";

  const ASSETS = {
    BTC: {
      symbol: "BTCUSDT",
      name: "Bitcoin",
      pair: "BTC/USDT"
    },
    ETH: {
      symbol: "ETHUSDT",
      name: "Ethereum",
      pair: "ETH/USDT"
    },
    BNB: {
      symbol: "BNBUSDT",
      name: "BNB",
      pair: "BNB/USDT"
    },
    USDC: {
      symbol: "USDCUSDT",
      name: "USD Coin",
      pair: "USDC/USDT"
    }
  };

  const PERIODS = {
    "24h": { interval: "30m", limit: 48 },
    "7d": { interval: "4h", limit: 42 },
    "30d": { interval: "12h", limit: 60 }
  };

  let assetAtual = "BTC";
  let periodoAtual = "24h";
  let serieAtual = [];
  let tickerAtual = null;
  let timer = null;


  function dinheiro(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) return "—";

    if (numero >= 1000) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
      }).format(numero);
    }

    if (numero >= 1) {
      return `US$ ${numero.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
      })}`;
    }

    return `US$ ${numero.toLocaleString("pt-BR", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 8
    })}`;
  }


  function numeroCompacto(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) return "—";

    return new Intl.NumberFormat("pt-BR", {
      notation: "compact",
      maximumFractionDigits: 2
    }).format(numero);
  }


  function percentual(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) return "—";

    return `${numero >= 0 ? "+" : ""}${numero.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}%`;
  }


  function classeVariacao(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) return "";

    return numero >= 0 ? "market-positive" : "market-negative";
  }


  async function fetchJSON(url) {
    const resposta = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!resposta.ok) {
      throw new Error(`Mercado HTTP ${resposta.status}`);
    }

    return resposta.json();
  }


  function carregarEstadoProjeto() {
    const estado = document.getElementById("turingProjetoEstado");
    const proxima = document.getElementById("turingProjetoProxima");

    if (!estado || !proxima) return;

    try {
      const dados = JSON.parse(
        localStorage.getItem("nexoterracore.projetos.v1") || "{}"
      );

      const projetos = Array.isArray(dados.projetos)
        ? dados.projetos
        : [];

      const turing = projetos.find(projeto =>
        String(projeto.id || "").toLowerCase() === "turing" ||
        String(projeto.nome || "").toLowerCase().includes("turing")
      );

      if (!turing) {
        estado.textContent = "Sem registro no módulo Projetos";
        proxima.textContent = "Cadastre a evolução do Turing em Projetos.";
        return;
      }

      const evolucao = Number(turing.evolucao);

      estado.textContent =
        `${turing.status || "Em desenvolvimento"}${
          Number.isFinite(evolucao) ? ` · ${evolucao}% registrado` : ""
        }`;

      proxima.textContent =
        turing.proxima
          ? `Próxima ação: ${turing.proxima}`
          : "Próxima ação não registrada.";

    } catch (_) {
      estado.textContent = "Registro indisponível";
      proxima.textContent = "Verifique o módulo Projetos.";
    }
  }


  async function carregarTicker(chave) {
    const asset = ASSETS[chave];

    const dados = await fetchJSON(
      `${MARKET_API}/api/v3/ticker/24hr?symbol=${asset.symbol}`
    );

    return dados;
  }


  async function carregarTodosTickers() {
    const status = document.getElementById("turingMercadoStatus");

    try {
      status.textContent = "Atualizando...";

      const resultados = await Promise.allSettled(
        Object.keys(ASSETS).map(async chave => {
          const ticker = await carregarTicker(chave);
          return { chave, ticker };
        })
      );

      let ativosOK = 0;

      resultados.forEach(resultado => {
        if (resultado.status !== "fulfilled") return;

        ativosOK++;

        const { chave, ticker } = resultado.value;

        const preco = document.getElementById(`marketPrice${chave}`);
        const variacao = document.getElementById(`marketChange${chave}`);

        if (preco) {
          preco.textContent = dinheiro(ticker.lastPrice);
        }

        if (variacao) {
          variacao.textContent = percentual(ticker.priceChangePercent);
          variacao.className =
            classeVariacao(ticker.priceChangePercent);
        }

        if (chave === assetAtual) {
          tickerAtual = ticker;
          atualizarDetalhesTicker();
        }
      });

      if (!ativosOK) {
        throw new Error("Nenhum ativo respondeu.");
      }

      status.textContent = `${ativosOK} ativos online`;

      document.getElementById("turingMercadoAtualizado").textContent =
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });

    } catch (erro) {
      console.error("[Projeto Turing] Mercado:", erro);
      status.textContent = "Fonte temporariamente indisponível";
    }
  }


  function atualizarDetalhesTicker() {
    if (!tickerAtual) return;

    const asset = ASSETS[assetAtual];
    const variacao = Number(tickerAtual.priceChangePercent);

    document.getElementById("marketChartTitle").textContent =
      `${asset.name} · ${asset.pair}`;

    document.getElementById("marketChartPrice").textContent =
      dinheiro(tickerAtual.lastPrice);

    const variacaoEl =
      document.getElementById("marketChartVariation");

    variacaoEl.textContent = percentual(variacao);
    variacaoEl.className = classeVariacao(variacao);

    document.getElementById("marketHigh").textContent =
      dinheiro(tickerAtual.highPrice);

    document.getElementById("marketLow").textContent =
      dinheiro(tickerAtual.lowPrice);

    document.getElementById("marketVolume").textContent =
      numeroCompacto(tickerAtual.quoteVolume);

    document.getElementById("marketPair").textContent =
      asset.symbol;
  }


  async function carregarGrafico() {
    const asset = ASSETS[assetAtual];
    const periodo = PERIODS[periodoAtual];
    const mensagem =
      document.getElementById("turingMarketChartMessage");

    mensagem.textContent = "Carregando série de mercado...";
    mensagem.classList.remove("oculto");

    try {
      const dados = await fetchJSON(
        `${MARKET_API}/api/v3/klines` +
        `?symbol=${asset.symbol}` +
        `&interval=${periodo.interval}` +
        `&limit=${periodo.limit}`
      );

      serieAtual = dados
        .map(item => ({
          tempo: Number(item[0]),
          fechamento: Number(item[4])
        }))
        .filter(item =>
          Number.isFinite(item.tempo) &&
          Number.isFinite(item.fechamento)
        );

      if (serieAtual.length < 2) {
        throw new Error("Série insuficiente.");
      }

      mensagem.classList.add("oculto");
      desenharGrafico();

    } catch (erro) {
      console.error("[Projeto Turing] Gráfico:", erro);

      serieAtual = [];

      mensagem.textContent =
        "Série de mercado temporariamente indisponível.";
      mensagem.classList.remove("oculto");

      limparCanvas();
    }
  }


  function limparCanvas() {
    const canvas = document.getElementById("turingMarketCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }


  function desenharGrafico() {
    const canvas = document.getElementById("turingMarketCanvas");

    if (!canvas || serieAtual.length < 2) return;

    const wrap = canvas.parentElement;
    const rect = wrap.getBoundingClientRect();

    const largura = Math.max(320, rect.width);
    const altura = Math.max(380, rect.height);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = largura * dpr;
    canvas.height = altura * dpr;

    canvas.style.width = `${largura}px`;
    canvas.style.height = `${altura}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const estilos = getComputedStyle(document.documentElement);

    const corLinha =
      estilos.getPropertyValue("--accent").trim() || "#ffffff";

    const corGrade =
      estilos.getPropertyValue("--border").trim() || "#333333";

    const corTexto =
      estilos.getPropertyValue("--muted-2").trim() || "#999999";

    ctx.clearRect(0, 0, largura, altura);

    const padding = {
      top: 34,
      right: 88,
      bottom: 42,
      left: 18
    };

    const plotW = largura - padding.left - padding.right;
    const plotH = altura - padding.top - padding.bottom;

    const valores = serieAtual.map(item => item.fechamento);

    let min = Math.min(...valores);
    let max = Math.max(...valores);

    if (min === max) {
      min *= 0.995;
      max *= 1.005;
    }

    const margem = (max - min) * 0.08;
    min -= margem;
    max += margem;

    // Grade horizontal
    ctx.lineWidth = 1;
    ctx.strokeStyle = corGrade;
    ctx.globalAlpha = 0.65;

    ctx.font = "11px system-ui";
    ctx.fillStyle = corTexto;
    ctx.textAlign = "left";

    for (let i = 0; i <= 4; i++) {
      const y =
        padding.top + (plotH / 4) * i;

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotW, y);
      ctx.stroke();

      const valor =
        max - ((max - min) / 4) * i;

      ctx.fillText(
        dinheiro(valor).replace("US$ ", "$"),
        padding.left + plotW + 10,
        y + 4
      );
    }

    ctx.globalAlpha = 1;

    // Linha principal
    ctx.beginPath();

    serieAtual.forEach((item, index) => {
      const x =
        padding.left +
        (index / (serieAtual.length - 1)) * plotW;

      const normalizado =
        (item.fechamento - min) / (max - min);

      const y =
        padding.top +
        plotH -
        normalizado * plotH;

      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = corLinha;
    ctx.lineWidth = 2.4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    // Pontos inicial/final de tempo
    const primeiro = new Date(serieAtual[0].tempo);
    const ultimo =
      new Date(serieAtual[serieAtual.length - 1].tempo);

    ctx.fillStyle = corTexto;
    ctx.font = "11px system-ui";

    ctx.textAlign = "left";
    ctx.fillText(
      primeiro.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }),
      padding.left,
      altura - 12
    );

    ctx.textAlign = "right";
    ctx.fillText(
      ultimo.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }),
      padding.left + plotW,
      altura - 12
    );
  }


  async function selecionarAsset(chave) {
    if (!ASSETS[chave]) return;

    assetAtual = chave;

    document.querySelectorAll("[data-market-asset]")
      .forEach(botao => {
        botao.classList.toggle(
          "ativo",
          botao.dataset.marketAsset === chave
        );
      });

    try {
      tickerAtual = await carregarTicker(chave);
      atualizarDetalhesTicker();
    } catch (erro) {
      console.error("[Projeto Turing] Ticker selecionado:", erro);
    }

    await carregarGrafico();
  }


  async function selecionarPeriodo(periodo) {
    if (!PERIODS[periodo]) return;

    periodoAtual = periodo;

    document.querySelectorAll("[data-market-period]")
      .forEach(botao => {
        botao.classList.toggle(
          "ativo",
          botao.dataset.marketPeriod === periodo
        );
      });

    await carregarGrafico();
  }


  async function atualizarTudo() {
    await carregarTodosTickers();

    try {
      tickerAtual = await carregarTicker(assetAtual);
      atualizarDetalhesTicker();
    } catch (_) {}

    await carregarGrafico();
  }


  document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("view-projeto-turing")) return;

    carregarEstadoProjeto();

    document.querySelectorAll("[data-market-asset]")
      .forEach(botao => {
        botao.addEventListener("click", () => {
          selecionarAsset(botao.dataset.marketAsset);
        });
      });

    document.querySelectorAll("[data-market-period]")
      .forEach(botao => {
        botao.addEventListener("click", () => {
          selecionarPeriodo(botao.dataset.marketPeriod);
        });
      });

    document
      .getElementById("btnTuringMercadoAtualizar")
      ?.addEventListener("click", atualizarTudo);

    window.addEventListener("resize", () => {
      if (serieAtual.length) desenharGrafico();
    });

    atualizarTudo();

    timer = window.setInterval(() => {
      carregarTodosTickers();
    }, 120000);
  });


  window.addEventListener("beforeunload", () => {
    if (timer) clearInterval(timer);
  });

})();
