(() => {
  "use strict";

  const FALLBACK_API = "https://api.gustavopaulasantos.com.br";
  const INTERVALO_MS = 30000;

  function apiBase() {
    try {
      if (
        typeof SalaDeComando !== "undefined" &&
        SalaDeComando.apiBase
      ) {
        return String(SalaDeComando.apiBase).replace(/\/$/, "");
      }
    } catch (_) {}

    return FALLBACK_API;
  }

  function token() {
    return (
      (typeof SalaDeComando !== "undefined" && SalaDeComando.token) ||
      window.nexoAuthToken ||
      null
    );
  }

  function texto(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
  }

  function aplicarEstado(estado, detalhe) {
    const card = document.getElementById("turing-security-card");
    const pill = document.getElementById("turingStatusPill");

    if (!card || !pill) return;

    card.dataset.securityState = estado;

    pill.classList.remove("turing-warn", "turing-alert");

    if (estado === "WARN") pill.classList.add("turing-warn");
    if (estado === "ALERT") pill.classList.add("turing-alert");

    if (estado === "PASS") {
      texto("turingStatusPillText", "Ativo · PASS");
      texto("turingLiveStatus", "Ativo · PASS");
    } else if (estado === "WARN") {
      texto("turingStatusPillText", "Atenção · WARN");
      texto("turingLiveStatus", "Atenção · WARN");
    } else {
      texto("turingStatusPillText", "Alerta · ALERT");
      texto("turingLiveStatus", "Alerta · ALERT");
    }

    texto("turingLiveMeta", detalhe);
  }

  async function atualizarMaturidade() {
    const auth = token();
    if (!auth) return;

    try {
      const resposta = await fetch(`${apiBase()}/api/control-plane`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${auth}`
        },
        cache: "no-store"
      });

      if (!resposta.ok) return;

      const dados = await resposta.json();
      const resumo = dados?.turingSecurity?.resumo || {};
      const eventos = Array.isArray(dados?.turingSecurity?.eventos)
        ? dados.turingSecurity.eventos
        : [];

      const total = Number(resumo.total || 0);
      const eventos24h = Number(resumo.eventos_24h || 0);
      const warn = Number(resumo.warn || 0);
      const alert = Number(resumo.alert || 0);

      let nivel = 10;
      let rotulo = "Observa o núcleo";

      if (total >= 10) {
        nivel = 20;
        rotulo = "Mantém telemetria";
      }

      if (total >= 60) {
        nivel = 30;
        rotulo = "Detecta padrões";
      }

      if (eventos24h >= 720) {
        nivel = 40;
        rotulo = "Observação contínua";
      }

      if (warn > 0 || alert > 0) {
        nivel = Math.max(nivel, 50);
        rotulo = "Classifica anomalias";
      }

      const ultimo = eventos[0];

      texto(
        "turingLastCommand",
        ultimo?.evento
          ? `${ultimo.evento} · ${ultimo.estado || "—"}`
          : "Aguardando evento"
      );

      texto("turingMaturityLevel", `Nível ${nivel}`);
      texto("turingMaturityLabel", rotulo);

    } catch (_) {
      // Mantém o último estado válido do Console.
    }
  }

  async function atualizar() {
    const inicio = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const resposta = await fetch(`${apiBase()}/api/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal
      });

      const latencia = Math.round(performance.now() - inicio);

      if (!resposta.ok) {
        aplicarEstado(
          "ALERT",
          `API HTTP ${resposta.status} · ${latencia} ms`
        );
        return;
      }

      const dados = await resposta.json();

      const banco = String(
        dados?.banco ??
        dados?.database ??
        ""
      ).toLowerCase();

      const bancoInformado = banco.length > 0;

      const bancoConectado =
        banco === "conectado" ||
        banco === "connected" ||
        banco === "online" ||
        banco === "ok";

      let estado = "PASS";

      if (bancoInformado && !bancoConectado) {
        estado = "ALERT";
      } else if (!bancoInformado || latencia >= 5000) {
        estado = "WARN";
      }

      const horario = new Date().toLocaleTimeString("pt-BR");

      const bancoTexto = bancoInformado
        ? (bancoConectado ? "Banco conectado" : `Banco ${banco}`)
        : "Banco não confirmado";

      aplicarEstado(
        estado,
        `API ${resposta.status} · ${bancoTexto} · ${latencia} ms · ${horario}`
      );

    } catch (erro) {
      const motivo =
        erro?.name === "AbortError"
          ? "timeout"
          : "falha de comunicação";

      aplicarEstado(
        "ALERT",
        `API indisponível · ${motivo}`
      );
    } finally {
      clearTimeout(timer);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    atualizar();
    atualizarMaturidade();

    setInterval(() => {
      atualizar();
      atualizarMaturidade();
    }, INTERVALO_MS);
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) atualizar();
  });
})();
