(() => {
  "use strict";

  const API = "https://api.binance.com";

  const STORAGE_TOKENS =
    "nexoterracore.market.tokens.v1";

  const STORAGE_NTCOINS =
    "nexoterracore.ntcoins.projeto.v1";

  const BASE = [
    {
      id: "btc",
      nome: "Bitcoin",
      symbol: "BTC",
      categoria: "Criptoativo",
      pair: "BTCUSDT"
    },
    {
      id: "eth",
      nome: "Ethereum",
      symbol: "ETH",
      categoria: "Criptoativo",
      pair: "ETHUSDT"
    },
    {
      id: "sol",
      nome: "Solana",
      symbol: "SOL",
      categoria: "Criptoativo",
      pair: "SOLUSDT"
    },
    {
      id: "xrp",
      nome: "XRP",
      symbol: "XRP",
      categoria: "Criptoativo",
      pair: "XRPUSDT"
    },
    {
      id: "bnb",
      nome: "BNB",
      symbol: "BNB",
      categoria: "Criptoativo",
      pair: "BNBUSDT"
    },
    {
      id: "usdc",
      nome: "USD Coin",
      symbol: "USDC",
      categoria: "Stablecoin",
      pair: "USDCUSDT"
    }
  ];

  const PERIODOS = {
    "24h": { interval: "30m", limit: 48 },
    "7d": { interval: "4h", limit: 42 },
    "30d": { interval: "12h", limit: 60 }
  };

  let ativoSelecionado = BASE[0];
  let periodoSelecionado = "24h";
  let serie = [];
  let tickerCache = {};
  let timer = null;


  function esc(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function lerTokens() {
    try {
      const dados = JSON.parse(
        localStorage.getItem(STORAGE_TOKENS) || "[]"
      );

      return Array.isArray(dados) ? dados : [];
    } catch (_) {
      return [];
    }
  }


  function salvarTokens(tokens) {
    localStorage.setItem(
      STORAGE_TOKENS,
      JSON.stringify(tokens)
    );
  }


  function lerNTCoins() {
    const padrao = {
      id: "ntcoins",
      nome: "NTCoins",
      symbol: "NTC",
      categoria: "Projeto interno",
      status: "Utilidade interna",
      proxima:
        "Fortalecer integração com a API NexoTerraCore",
      observacao:
        "Créditos digitais internos do ecossistema; sem cotação pública."
    };

    try {
      return {
        ...padrao,
        ...JSON.parse(
          localStorage.getItem(STORAGE_NTCOINS) || "{}"
        )
      };
    } catch (_) {
      return padrao;
    }
  }


  function salvarNTCoins(dados) {
    localStorage.setItem(
      STORAGE_NTCOINS,
      JSON.stringify(dados)
    );
  }


  function todosAtivos() {
    return [...BASE, ...lerTokens()];
  }


  function moeda(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) return "—";

    if (numero >= 1000) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
      }).format(numero);
    }

    return `US$ ${numero.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })}`;
  }


  function compacto(valor) {
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

    return `${numero >= 0 ? "+" : ""}${numero.toLocaleString(
      "pt-BR",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )}%`;
  }


  function classeVariacao(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) return "";

    return numero >= 0
      ? "market-positive"
      : "market-negative";
  }


  async function json(url) {
    const resposta = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    });

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }

    return resposta.json();
  }


  async function ticker(pair) {
    return json(
      `${API}/api/v3/ticker/24hr?symbol=${encodeURIComponent(pair)}`
    );
  }


  function renderNTCoins() {
    const n = lerNTCoins();

    document.getElementById("ntcoinsStatus").textContent =
      n.status || "—";

    document.getElementById("ntcoinsProxima").textContent =
      n.proxima || "—";

    document.getElementById("ntcoinsObservacao").textContent =
      n.observacao || "—";
  }


  function renderTokens() {
    const lista =
      document.getElementById("marketTokenList");

    if (!lista) return;

    const custom = lerTokens();
    const ativos = todosAtivos();

    document.getElementById(
      "marketTotalAtivos"
    ).textContent = ativos.length + 1;

    lista.innerHTML = ativos.map(item => {
      const t = tickerCache[item.pair];
      const selecionado =
        ativoSelecionado?.id === item.id;

      return `
        <article
          class="market-token-row ${selecionado ? "ativo" : ""}"
          data-token-select="${esc(item.id)}"
        >
          <div class="market-token-symbol">
            ${esc(item.symbol)}
          </div>

          <div class="market-token-info">
            <strong>${esc(item.nome)}</strong>
            <span>
              ${esc(item.categoria || "Pesquisa")}
              ${item.rede ? ` · ${esc(item.rede)}` : ""}
            </span>
          </div>

          <div class="market-token-live">
            <strong>
              ${item.pair && t ? moeda(t.lastPrice) : "—"}
            </strong>

            <span class="${
              item.pair && t
                ? classeVariacao(t.priceChangePercent)
                : ""
            }">
              ${
                item.pair && t
                  ? percentual(t.priceChangePercent)
                  : item.pair
                    ? "Aguardando mercado"
                    : "Sem fonte ao vivo"
              }
            </span>
          </div>

          ${
            custom.some(c => c.id === item.id)
              ? `
                <button
                  class="market-token-edit"
                  data-token-edit="${esc(item.id)}"
                  type="button"
                >
                  Editar
                </button>
              `
              : ""
          }
        </article>
      `;
    }).join("");

    lista.querySelectorAll("[data-token-select]")
      .forEach(el => {
        el.addEventListener("click", evento => {
          if (
            evento.target.closest("[data-token-edit]")
          ) return;

          selecionarAtivo(
            el.dataset.tokenSelect
          );
        });
      });

    lista.querySelectorAll("[data-token-edit]")
      .forEach(btn => {
        btn.addEventListener("click", evento => {
          evento.stopPropagation();
          abrirToken(btn.dataset.tokenEdit);
        });
      });
  }


  async function atualizarTickers() {
    const ativos = todosAtivos()
      .filter(a => a.pair)
      .slice(0, 20);

    let sucesso = 0;

    const resultados = await Promise.allSettled(
      ativos.map(async item => {
        const dados = await ticker(
          String(item.pair).toUpperCase()
        );

        tickerCache[item.pair] = dados;
        sucesso++;
      })
    );

    void resultados;

    document.getElementById(
      "marketFonteStatus"
    ).textContent =
      sucesso
        ? `${sucesso} pares online`
        : "Fonte indisponível";

    document.getElementById(
      "marketUltimaAtualizacao"
    ).textContent =
      new Date().toLocaleTimeString(
        "pt-BR",
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }
      );

    renderTokens();
    atualizarDetalhes();
  }


  function atualizarDetalhes() {
    const a = ativoSelecionado;
    const t = a?.pair
      ? tickerCache[a.pair]
      : null;

    document.getElementById(
      "marketChartTitle"
    ).textContent =
      a
        ? `${a.nome} · ${a.symbol}`
        : "Selecione um ativo";

    document.getElementById(
      "marketPair"
    ).textContent =
      a?.pair || "Sem par público";

    const preco =
      document.getElementById(
        "marketChartPrice"
      );

    const variacao =
      document.getElementById(
        "marketChartChange"
      );

    if (!t) {
      preco.textContent = "—";
      variacao.textContent =
        a?.pair
          ? "Aguardando fonte"
          : "Pesquisa cadastrada";
      variacao.className = "";

      document.getElementById(
        "marketHigh"
      ).textContent = "—";

      document.getElementById(
        "marketLow"
      ).textContent = "—";

      document.getElementById(
        "marketVolume"
      ).textContent = "—";

      return;
    }

    preco.textContent =
      moeda(t.lastPrice);

    variacao.textContent =
      percentual(t.priceChangePercent);

    variacao.className =
      classeVariacao(
        t.priceChangePercent
      );

    document.getElementById(
      "marketHigh"
    ).textContent =
      moeda(t.highPrice);

    document.getElementById(
      "marketLow"
    ).textContent =
      moeda(t.lowPrice);

    document.getElementById(
      "marketVolume"
    ).textContent =
      compacto(t.quoteVolume);
  }


  async function selecionarAtivo(id) {
    const encontrado =
      todosAtivos().find(
        item => item.id === id
      );

    if (!encontrado) return;

    ativoSelecionado = encontrado;

    renderTokens();
    atualizarDetalhes();

    if (
      encontrado.pair &&
      !tickerCache[encontrado.pair]
    ) {
      try {
        tickerCache[encontrado.pair] =
          await ticker(encontrado.pair);

        renderTokens();
        atualizarDetalhes();
      } catch (_) {}
    }

    carregarGrafico();
  }


  async function carregarGrafico() {
    const mensagem =
      document.getElementById(
        "marketChartMessage"
      );

    if (!ativoSelecionado?.pair) {
      serie = [];
      limparGrafico();

      mensagem.textContent =
        "Este registro ainda não possui uma fonte de mercado vinculada.";

      mensagem.classList.remove("oculto");
      return;
    }

    mensagem.textContent =
      "Carregando série pública...";

    mensagem.classList.remove("oculto");

    try {
      const cfg =
        PERIODOS[periodoSelecionado];

      const dados = await json(
        `${API}/api/v3/klines` +
        `?symbol=${encodeURIComponent(
          ativoSelecionado.pair
        )}` +
        `&interval=${cfg.interval}` +
        `&limit=${cfg.limit}`
      );

      serie = dados.map(item => ({
        tempo: Number(item[0]),
        fechamento: Number(item[4])
      })).filter(item =>
        Number.isFinite(item.tempo) &&
        Number.isFinite(item.fechamento)
      );

      if (serie.length < 2) {
        throw new Error(
          "Série insuficiente"
        );
      }

      mensagem.classList.add("oculto");
      desenharGrafico();

    } catch (erro) {
      console.error(
        "[Mercado Digital]",
        erro
      );

      serie = [];
      limparGrafico();

      mensagem.textContent =
        "Série não disponível para este par.";

      mensagem.classList.remove("oculto");
    }
  }


  function limparGrafico() {
    const canvas =
      document.getElementById(
        "marketCanvas"
      );

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }


  function desenharGrafico() {
    const canvas =
      document.getElementById(
        "marketCanvas"
      );

    if (!canvas || serie.length < 2) {
      return;
    }

    const wrap = canvas.parentElement;
    const rect =
      wrap.getBoundingClientRect();

    const w =
      Math.max(420, rect.width);

    const h =
      Math.max(330, rect.height);

    const dpr =
      Math.min(
        window.devicePixelRatio || 1,
        2
      );

    canvas.width = w * dpr;
    canvas.height = h * dpr;

    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx =
      canvas.getContext("2d");

    ctx.setTransform(
      dpr, 0, 0, dpr, 0, 0
    );

    ctx.clearRect(0, 0, w, h);

    const css =
      getComputedStyle(
        document.documentElement
      );

    const linha =
      css.getPropertyValue(
        "--accent"
      ).trim() || "#00d99b";

    const grade =
      css.getPropertyValue(
        "--border"
      ).trim() || "#24323a";

    const texto =
      css.getPropertyValue(
        "--muted-2"
      ).trim() || "#71808a";

    const pad = {
      top: 30,
      right: 88,
      bottom: 38,
      left: 18
    };

    const plotW =
      w - pad.left - pad.right;

    const plotH =
      h - pad.top - pad.bottom;

    const valores =
      serie.map(x => x.fechamento);

    let min = Math.min(...valores);
    let max = Math.max(...valores);

    if (min === max) {
      min *= .995;
      max *= 1.005;
    }

    const margem =
      (max - min) * .08;

    min -= margem;
    max += margem;

    ctx.strokeStyle = grade;
    ctx.fillStyle = texto;
    ctx.font = "11px system-ui";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y =
        pad.top +
        (plotH / 4) * i;

      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(
        pad.left + plotW,
        y
      );
      ctx.stroke();

      const valor =
        max -
        ((max - min) / 4) * i;

      ctx.fillText(
        moeda(valor).replace(
          "US$ ",
          "$"
        ),
        pad.left + plotW + 9,
        y + 4
      );
    }

    ctx.beginPath();

    serie.forEach(
      (item, index) => {

        const x =
          pad.left +
          (
            index /
            (serie.length - 1)
          ) * plotW;

        const normal =
          (
            item.fechamento - min
          ) /
          (max - min);

        const y =
          pad.top +
          plotH -
          normal * plotH;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    );

    ctx.strokeStyle = linha;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.fillStyle = texto;
    ctx.font = "11px system-ui";

    const primeiro =
      new Date(serie[0].tempo);

    const ultimo =
      new Date(
        serie[serie.length - 1].tempo
      );

    ctx.textAlign = "left";

    ctx.fillText(
      primeiro.toLocaleString(
        "pt-BR",
        {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        }
      ),
      pad.left,
      h - 10
    );

    ctx.textAlign = "right";

    ctx.fillText(
      ultimo.toLocaleString(
        "pt-BR",
        {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        }
      ),
      pad.left + plotW,
      h - 10
    );
  }


  function limparForm() {
    [
      "marketTokenId",
      "marketTokenNome",
      "marketTokenSymbol",
      "marketTokenPair",
      "marketTokenRede",
      "marketTokenContrato",
      "marketTokenFonte",
      "marketTokenProxima",
      "marketTokenObservacao"
    ].forEach(id => {
      const el =
        document.getElementById(id);

      if (el) el.value = "";
    });

    document.getElementById(
      "marketTokenCategoria"
    ).value = "Token";

    document.getElementById(
      "marketTokenModo"
    ).value = "token";
  }


  function abrirToken(id = null) {
    limparForm();

    const modal =
      document.getElementById(
        "modalMarketToken"
      );

    const titulo =
      document.getElementById(
        "marketModalTitulo"
      );

    const item =
      id
        ? lerTokens().find(
            x => x.id === id
          )
        : null;

    titulo.textContent =
      item
        ? "Editar token"
        : "Cadastrar token";

    if (item) {
      document.getElementById(
        "marketTokenId"
      ).value = item.id || "";

      document.getElementById(
        "marketTokenNome"
      ).value = item.nome || "";

      document.getElementById(
        "marketTokenSymbol"
      ).value = item.symbol || "";

      document.getElementById(
        "marketTokenCategoria"
      ).value =
        item.categoria || "Token";

      document.getElementById(
        "marketTokenPair"
      ).value = item.pair || "";

      document.getElementById(
        "marketTokenRede"
      ).value = item.rede || "";

      document.getElementById(
        "marketTokenContrato"
      ).value =
        item.contrato || "";

      document.getElementById(
        "marketTokenFonte"
      ).value = item.fonte || "";

      document.getElementById(
        "marketTokenProxima"
      ).value =
        item.proxima || "";

      document.getElementById(
        "marketTokenObservacao"
      ).value =
        item.observacao || "";
    }

    modal.classList.remove("oculto");
  }


  function abrirNTCoins() {
    limparForm();

    const n = lerNTCoins();

    document.getElementById(
      "marketModalTitulo"
    ).textContent =
      "Editar projeto NTCoins";

    document.getElementById(
      "marketTokenModo"
    ).value = "ntcoins";

    document.getElementById(
      "marketTokenNome"
    ).value = n.nome;

    document.getElementById(
      "marketTokenSymbol"
    ).value = n.symbol;

    document.getElementById(
      "marketTokenCategoria"
    ).value =
      "Projeto interno";

    document.getElementById(
      "marketTokenProxima"
    ).value = n.proxima || "";

    document.getElementById(
      "marketTokenObservacao"
    ).value =
      n.observacao || "";

    document.getElementById(
      "marketTokenFonte"
    ).value =
      "NexoTerraCore / projeto interno";

    document.getElementById(
      "modalMarketToken"
    ).classList.remove("oculto");
  }


  function salvarFormulario() {
    const modo =
      document.getElementById(
        "marketTokenModo"
      ).value;

    const nome =
      document.getElementById(
        "marketTokenNome"
      ).value.trim();

    const symbol =
      document.getElementById(
        "marketTokenSymbol"
      ).value.trim().toUpperCase();

    if (!nome || !symbol) {
      alert(
        "Informe nome e símbolo."
      );
      return;
    }

    const dados = {
      id:
        document.getElementById(
          "marketTokenId"
        ).value ||
        `token-${Date.now()}`,

      nome,

      symbol,

      categoria:
        document.getElementById(
          "marketTokenCategoria"
        ).value,

      pair:
        document.getElementById(
          "marketTokenPair"
        ).value
          .trim()
          .toUpperCase(),

      rede:
        document.getElementById(
          "marketTokenRede"
        ).value.trim(),

      contrato:
        document.getElementById(
          "marketTokenContrato"
        ).value.trim(),

      fonte:
        document.getElementById(
          "marketTokenFonte"
        ).value.trim(),

      proxima:
        document.getElementById(
          "marketTokenProxima"
        ).value.trim(),

      observacao:
        document.getElementById(
          "marketTokenObservacao"
        ).value.trim()
    };

    if (modo === "ntcoins") {
      const atual = lerNTCoins();

      salvarNTCoins({
        ...atual,
        nome: dados.nome,
        symbol: dados.symbol,
        categoria:
          "Projeto interno",
        status:
          "Utilidade interna",
        proxima: dados.proxima,
        observacao:
          dados.observacao
      });

      renderNTCoins();

    } else {
      const tokens = lerTokens();

      const pos =
        tokens.findIndex(
          x => x.id === dados.id
        );

      if (pos >= 0) {
        tokens[pos] = dados;
      } else {
        tokens.push(dados);
      }

      salvarTokens(tokens);
      renderTokens();
    }

    document.getElementById(
      "modalMarketToken"
    ).classList.add("oculto");
  }


  document.addEventListener(
    "DOMContentLoaded",
    () => {

      if (
        !document.getElementById(
          "view-projeto-turing"
        )
      ) return;

      renderNTCoins();
      renderTokens();

      document.getElementById(
        "btnNovoToken"
      )?.addEventListener(
        "click",
        () => abrirToken()
      );

      document.getElementById(
        "btnEditarNTCoins"
      )?.addEventListener(
        "click",
        abrirNTCoins
      );

      document.getElementById(
        "marketModalFechar"
      )?.addEventListener(
        "click",
        () => {
          document.getElementById(
            "modalMarketToken"
          ).classList.add("oculto");
        }
      );

      document.getElementById(
        "marketTokenSalvar"
      )?.addEventListener(
        "click",
        salvarFormulario
      );

      document.getElementById(
        "btnMercadoAtualizar"
      )?.addEventListener(
        "click",
        async () => {
          await atualizarTickers();
          await carregarGrafico();
        }
      );

      document.querySelectorAll(
        "[data-market-period]"
      ).forEach(btn => {
        btn.addEventListener(
          "click",
          () => {

            periodoSelecionado =
              btn.dataset.marketPeriod;

            document
              .querySelectorAll(
                "[data-market-period]"
              )
              .forEach(b =>
                b.classList.toggle(
                  "ativo",
                  b === btn
                )
              );

            carregarGrafico();
          }
        );
      });

      window.addEventListener(
        "resize",
        () => {
          if (serie.length) {
            desenharGrafico();
          }
        }
      );

      atualizarTickers()
        .then(carregarGrafico);

      timer = setInterval(
        atualizarTickers,
        120000
      );
    }
  );


  window.addEventListener(
    "beforeunload",
    () => {
      if (timer) {
        clearInterval(timer);
      }
    }
  );

})();
