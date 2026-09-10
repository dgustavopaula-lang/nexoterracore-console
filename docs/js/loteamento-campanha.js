(() => {
  "use strict";

  const STORAGE =
    "nexoterracore.loteamento.campanha.v1";

  const API_BASE =
    ["localhost", "127.0.0.1"].includes(location.hostname)
      ? "http://localhost:3000"
      : "https://nexoterracore-api.onrender.com";

  const PADRAO = {
    areaTotalM2: 20000,
    areaConsideradaM2: 20000,
    tamanhosLote: "200, 250, 300, 500, 1000",
    precoPorLote: "",
    custoTotal: "",
    participacaoPercentual: "",
    participacaoTipo: "vgv"
  };

  let ultimoResultado = null;


  function ler() {
    try {
      return {
        ...PADRAO,
        ...JSON.parse(
          localStorage.getItem(STORAGE) || "{}"
        )
      };
    } catch (_) {
      return { ...PADRAO };
    }
  }


  function salvar(dados) {
    localStorage.setItem(
      STORAGE,
      JSON.stringify(dados)
    );
  }


  function moeda(valor) {
    if (
      valor === null ||
      valor === undefined ||
      !Number.isFinite(Number(valor))
    ) {
      return "—";
    }

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2
    }).format(Number(valor));
  }


  function numero(valor, casas = 2) {
    if (
      valor === null ||
      valor === undefined ||
      !Number.isFinite(Number(valor))
    ) {
      return "—";
    }

    return Number(valor).toLocaleString(
      "pt-BR",
      {
        maximumFractionDigits: casas
      }
    );
  }


  function percentual(valor) {
    if (
      valor === null ||
      valor === undefined ||
      !Number.isFinite(Number(valor))
    ) {
      return "—";
    }

    return `${numero(valor, 2)}%`;
  }


  function valorOpcional(id) {
    const el = document.getElementById(id);
    const texto = el?.value?.trim() || "";

    return texto === ""
      ? null
      : Number(texto);
  }


  function dadosFormulario() {
    const tamanhos =
      document
        .getElementById("campTamanhos")
        .value
        .split(",")
        .map(x => Number(x.trim()))
        .filter(x => Number.isFinite(x) && x > 0);

    return {
      areaTotalM2:
        Number(
          document.getElementById(
            "campAreaTotal"
          ).value
        ),

      areaConsideradaM2:
        Number(
          document.getElementById(
            "campAreaCalculo"
          ).value
        ),

      tamanhosLote:
        document.getElementById(
          "campTamanhos"
        ).value,

      tamanhosLoteM2: tamanhos,

      precoPorLote:
        valorOpcional(
          "campPrecoLote"
        ),

      custoTotal:
        valorOpcional(
          "campCustoTotal"
        ),

      participacaoPercentual:
        valorOpcional(
          "campParticipacao"
        ),

      participacaoTipo:
        document.getElementById(
          "campTipoParticipacao"
        ).value
    };
  }


  function dadosParaSalvar() {
    const d = dadosFormulario();

    return {
      areaTotalM2:
        d.areaTotalM2,

      areaConsideradaM2:
        d.areaConsideradaM2,

      tamanhosLote:
        d.tamanhosLote,

      precoPorLote:
        d.precoPorLote ?? "",

      custoTotal:
        d.custoTotal ?? "",

      participacaoPercentual:
        d.participacaoPercentual ?? "",

      participacaoTipo:
        d.participacaoTipo
    };
  }


  function payloadAPI() {
    const d = dadosFormulario();

    return {
      areaTotalM2:
        d.areaTotalM2,

      areaConsideradaM2:
        d.areaConsideradaM2,

      tamanhosLoteM2:
        d.tamanhosLoteM2,

      precoPorLote:
        d.precoPorLote,

      custoTotal:
        d.custoTotal,

      participacaoPercentual:
        d.participacaoPercentual,

      participacaoTipo:
        d.participacaoTipo
    };
  }


  function renderTabela(resultado) {
    const destino =
      document.getElementById(
        "campResultado"
      );

    ultimoResultado = resultado;

    if (
      !resultado ||
      !Array.isArray(resultado.cenarios)
    ) {
      destino.innerHTML =
        '<div class="notice">Nenhum resultado disponível.</div>';
      return;
    }

    destino.innerHTML = `
      <div class="camp-result-summary">

        <article>
          <span>Área total</span>
          <strong>
            ${numero(resultado.areaTotalM2)} m²
          </strong>
        </article>

        <article>
          <span>Área usada no cálculo</span>
          <strong>
            ${numero(resultado.areaConsideradaM2)} m²
          </strong>
        </article>

        <article>
          <span>Cenários calculados</span>
          <strong>
            ${resultado.cenarios.length}
          </strong>
        </article>

      </div>

      <div class="table-wrap camp-table-wrap">
        <table class="data-table camp-table">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Quantidade</th>
              <th>Sobra</th>
              <th>VGV</th>
              <th>Lucro</th>
              <th>Margem</th>
              <th>Participação</th>
            </tr>
          </thead>

          <tbody>
            ${resultado.cenarios.map(c => `
              <tr>
                <td>
                  <strong>
                    ${numero(c.tamanhoLoteM2)} m²
                  </strong>
                </td>

                <td>
                  ${numero(c.quantidadeLotes, 0)}
                </td>

                <td>
                  ${numero(c.sobraM2)} m²
                </td>

                <td>
                  ${moeda(c.vgv)}
                </td>

                <td>
                  ${moeda(c.lucroEstimado)}
                </td>

                <td>
                  ${percentual(
                    c.margemLucroPercentual
                  )}
                </td>

                <td>
                  ${
                    c.participacaoTipo === "lotes" &&
                    c.lotesProprietario !== null
                      ? `${numero(
                          c.lotesProprietario
                        )} lotes`
                      : moeda(
                          c.participacaoProprietario
                        )
                  }
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <div class="notice camp-footnote">
        Estimativas técnicas editáveis.
        A quantidade definitiva depende do projeto
        urbanístico e das aprovações aplicáveis.
        O valor potencial permanece separado do
        patrimônio realizado.
      </div>
    `;
  }


  function status(texto, tipo = "") {
    const el =
      document.getElementById(
        "campApiStatus"
      );

    if (!el) return;

    el.textContent = texto;
    el.className =
      `camp-api-status ${tipo}`.trim();
  }


  async function calcular() {
    const token =
      window.nexoAuthToken;

    if (!token) {
      status(
        "Entre na Sala de Comando para calcular pela API.",
        "alerta"
      );
      return;
    }

    const payload =
      payloadAPI();

    if (
      !Number.isFinite(payload.areaTotalM2) ||
      payload.areaTotalM2 <= 0
    ) {
      status(
        "Informe uma área total válida.",
        "erro"
      );
      return;
    }

    if (!payload.tamanhosLoteM2.length) {
      status(
        "Informe pelo menos um tamanho de lote.",
        "erro"
      );
      return;
    }

    salvar(dadosParaSalvar());

    status(
      "Calculando pela API NexoTerraCore..."
    );

    try {
      const resposta =
        await fetch(
          `${API_BASE}/api/projetos/loteamento/cenarios`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json"
            },
            body:
              JSON.stringify(payload)
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro ||
          "Não foi possível calcular."
        );
      }

      renderTabela(dados);

      status(
        "API conectada · estimativas atualizadas",
        "ok"
      );

    } catch (erro) {
      console.error(
        "[Loteamento Campanha]",
        erro
      );

      status(
        erro.message ||
        "Falha de conexão com a API.",
        "erro"
      );
    }
  }


  function render() {
    const host =
      document.getElementById(
        "loteamentoCampanhaCard"
      );

    if (!host) return;

    const d = ler();

    host.innerHTML = `
      <article class="camp-monitor-card">

        <div class="camp-monitor-header">

          <div>
            <span class="eyebrow">
              PROJETO PATRIMONIAL · MONITORAMENTO
            </span>

            <h3>
              Projeto Loteamento Campanha
            </h3>

            <p>
              Área de 20.000 m² · estimativas técnicas,
              econômicas e de permuta calculadas pela
              API NexoTerraCore.
            </p>
          </div>

          <div class="camp-priority">
            PRIORIDADE MÁXIMA
          </div>

        </div>


        <div class="camp-status-grid">

          <article>
            <span>Status</span>
            <strong>
              Estruturação / encaminhamento técnico
            </strong>
          </article>

          <article>
            <span>Natureza</span>
            <strong>
              Ativo imobiliário / loteamento
            </strong>
          </article>

          <article>
            <span>Modelo econômico</span>
            <strong>
              Permuta editável
            </strong>
          </article>

          <article>
            <span>API</span>
            <strong id="campApiStatus"
                    class="camp-api-status">
              Aguardando cálculo
            </strong>
          </article>

        </div>


        <div class="camp-form-grid">

          <label>
            Área total do ativo (m²)
            <input
              id="campAreaTotal"
              type="number"
              min="1"
              step="1"
              value="${d.areaTotalM2}"
            >
          </label>

          <label>
            Área usada no cálculo (m²)
            <input
              id="campAreaCalculo"
              type="number"
              min="1"
              step="1"
              value="${d.areaConsideradaM2}"
            >
          </label>

          <label class="camp-span-2">
            Tamanhos de lote para estimativa
            <input
              id="campTamanhos"
              type="text"
              value="${d.tamanhosLote}"
              placeholder="200, 250, 300, 500, 1000"
            >
          </label>

          <label>
            Valor estimado por lote (R$)
            <input
              id="campPrecoLote"
              type="number"
              min="0"
              step="0.01"
              value="${d.precoPorLote}"
              placeholder="Opcional"
            >
          </label>

          <label>
            Custos estimados do projeto (R$)
            <input
              id="campCustoTotal"
              type="number"
              min="0"
              step="0.01"
              value="${d.custoTotal}"
              placeholder="Opcional"
            >
          </label>

          <label>
            Participação do proprietário (%)
            <input
              id="campParticipacao"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value="${d.participacaoPercentual}"
              placeholder="30, 40, 50..."
            >
          </label>

          <label>
            Base da participação
            <select id="campTipoParticipacao">

              <option value="vgv"
                ${d.participacaoTipo === "vgv"
                  ? "selected"
                  : ""}>
                Percentual do VGV
              </option>

              <option value="lucro"
                ${d.participacaoTipo === "lucro"
                  ? "selected"
                  : ""}>
                Percentual do lucro
              </option>

              <option value="lotes"
                ${d.participacaoTipo === "lotes"
                  ? "selected"
                  : ""}>
                Percentual em lotes
              </option>

            </select>
          </label>

        </div>


        <div class="camp-actions">

          <button
            id="campSalvar"
            class="btn-secondary"
            type="button">
            Salvar estimativas
          </button>

          <button
            id="campCalcular"
            class="btn-primary"
            type="button">
            Calcular pela API
          </button>

        </div>


        <div id="campResultado"
             class="camp-resultado">

          <div class="notice">
            Informe os parâmetros desejados e use
            “Calcular pela API”.
          </div>

        </div>

      </article>
    `;


    document
      .getElementById(
        "campSalvar"
      )
      .addEventListener(
        "click",
        () => {
          salvar(
            dadosParaSalvar()
          );

          status(
            "Estimativas salvas neste dispositivo.",
            "ok"
          );
        }
      );


    document
      .getElementById(
        "campCalcular"
      )
      .addEventListener(
        "click",
        calcular
      );
  }


  document.addEventListener(
    "DOMContentLoaded",
    render
  );

})();
