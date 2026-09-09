(() => {
  const estado = {
    health: null,
    control: null,
    me: null,
    latenciaMs: null,
    atualizadoEm: null,
    eventos: []
  };

  function apiBase() {
    return typeof SalaDeComando !== "undefined"
      ? SalaDeComando.apiBase
      : "https://nexoterracore-api.onrender.com";
  }

  function token() {
    return (
      (typeof SalaDeComando !== "undefined" && SalaDeComando.token) ||
      window.nexoAuthToken ||
      null
    );
  }

  function escapar(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function dataHora(valor) {
    if (!valor) return "—";
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR");
  }

  function numero(valor) {
    const n = Number(valor);
    return Number.isFinite(n) ? new Intl.NumberFormat("pt-BR").format(n) : "0";
  }

  function registrar(texto, tipo = "info") {
    estado.eventos.unshift({ texto, tipo, em: new Date().toISOString() });
    estado.eventos = estado.eventos.slice(0, 30);
    renderEventos();
  }

  function instalarEstilo() {
    if (document.getElementById("controlPlaneStyle")) return;

    const style = document.createElement("style");
    style.id = "controlPlaneStyle";
    style.textContent = `
      .cp-top-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:22px 0}
      .cp-live-card,.cp-module-card{appearance:none;width:100%;text-align:left;color:inherit;cursor:pointer}
      .cp-live-card{background:#10252c;border:1px solid #153b43;border-radius:14px;padding:24px 28px;min-height:145px}
      .cp-live-card span{display:block;color:#81949b;text-transform:uppercase;letter-spacing:.08em;font-size:12px;margin-bottom:14px}
      .cp-live-card strong{display:block;font-size:23px}.cp-live-card small{display:block;margin-top:10px;color:#789097}
      .cp-live-card:hover,.cp-module-card:hover{border-color:#00d99b;transform:translateY(-1px)}
      .cp-modules{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:20px 0}
      .cp-module-card{background:linear-gradient(135deg,#082529,#071b20);border:1px solid #123b40;border-radius:16px;padding:22px;min-height:170px;transition:.18s ease}
      .cp-module-card .cp-num{display:block;color:#00efb0;font-family:monospace;font-size:12px;margin-bottom:17px}
      .cp-module-card strong{display:block;font-size:20px;margin-bottom:8px}.cp-module-card p{margin:0;color:#8da0a5;line-height:1.45}.cp-module-card small{display:block;color:#00d99b;margin-top:14px}
      .cp-detail{margin-top:22px;border:1px solid #173a40;border-radius:16px;background:#091c21;padding:24px}.cp-detail.oculto{display:none}
      .cp-detail-header{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px}.cp-detail-header h3{margin:0}.cp-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .cp-detail-item{border:1px solid #19363b;border-radius:10px;background:#0b2025;padding:14px}.cp-detail-item span{display:block;color:#80949a;font-size:12px;margin-bottom:6px}.cp-detail-item strong{display:block;word-break:break-word}
      .cp-events{margin-top:22px;border:1px solid #173a40;border-radius:16px;background:#091c21;padding:22px}.cp-events-header{display:flex;justify-content:space-between;align-items:center;gap:12px}.cp-event-list{display:grid;gap:8px;margin-top:14px}.cp-event{font-family:monospace;font-size:12px;border-left:3px solid #2d5258;padding:9px 12px;background:#08181c}.cp-event.erro{border-left-color:#ff725e}.cp-event.ok{border-left-color:#00d99b}
      .cp-status-ok{color:#00e3a3}.cp-status-warn{color:#e7bd61}.cp-status-erro{color:#ff725e}
      @media(max-width:980px){.cp-modules{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:720px){.cp-top-grid,.cp-modules,.cp-detail-grid{grid-template-columns:1fr}.cp-detail-header{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function montarTela() {
    const view = document.getElementById("view-api");
    if (!view) return false;

    view.innerHTML = `
      <div class="section-header">
        <div>
          <span class="eyebrow">NÚCLEO TÉCNICO</span>
          <h2>API / Control Plane</h2>
          <p>Status operacional do NexoTerraCore com dados consultados diretamente da API.</p>
        </div>
        <div class="section-actions">
          <button id="btnAtualizarControlPlane" class="btn-primary" type="button">Atualizar status</button>
        </div>
      </div>

      <div class="cp-top-grid">
        <button class="cp-live-card" data-cp="core" type="button">
          <span>Core API</span>
          <strong id="cpApi">Aguardando...</strong>
          <small id="cpApiSub">/api/health</small>
        </button>
        <button class="cp-live-card" data-cp="banco" type="button">
          <span>PostgreSQL</span>
          <strong id="cpBanco">Aguardando...</strong>
          <small id="cpBancoSub">Conexão ainda não verificada</small>
        </button>
        <button class="cp-live-card" data-cp="latencia" type="button">
          <span>Latência & Tráfego</span>
          <strong id="cpLatencia">— ms</strong>
          <small id="cpTrafego">Metering aguardando sessão</small>
        </button>
      </div>

      <div class="cp-modules">
        <button class="cp-module-card" data-cp="seguranca" type="button"><span class="cp-num">01</span><strong>Segurança & Sessões</strong><p>Autenticação, perfil da sessão e rate limit.</p><small id="cpSegResumo">Aguardando sessão</small></button>
        <button class="cp-module-card" data-cp="apikeys" type="button"><span class="cp-num">02</span><strong>API Keys & Scopes</strong><p>Chaves da organização, scopes, validade e último uso.</p><small id="cpKeysResumo">Aguardando sessão</small></button>
        <button class="cp-module-card" data-cp="multitenancy" type="button"><span class="cp-num">03</span><strong>Multitenancy</strong><p>Organização ativa, fazenda e isolamento do contexto.</p><small id="cpMultiResumo">Aguardando sessão</small></button>
        <button class="cp-module-card" data-cp="metering" type="button"><span class="cp-num">04</span><strong>Consumo & Metering</strong><p>Requisições registradas e consumo nas últimas 24 horas.</p><small id="cpMeterResumo">Aguardando sessão</small></button>
        <button class="cp-module-card" data-cp="integracoes" type="button"><span class="cp-num">05</span><strong>Integrações</strong><p>Turing, NTCoins/PayPal, mapas e serviços externos.</p><small>Ver estado verificável</small></button>
        <button class="cp-module-card" data-cp="deploy" type="button"><span class="cp-num">06</span><strong>Deploy & Infraestrutura</strong><p>Host da API, ambiente publicado e origem do Console.</p><small>Ver infraestrutura</small></button>
        <button class="cp-module-card" data-cp="auditoria" type="button"><span class="cp-num">07</span><strong>Auditoria & Eventos</strong><p>Eventos desta sessão e disponibilidade de auditoria.</p><small>Ver eventos</small></button>
        <button class="cp-module-card" data-cp="migrations" type="button"><span class="cp-num">08</span><strong>Migrations & Banco</strong><p>Integridade do banco e disponibilidade de migrations.</p><small>Ver situação</small></button>
        <button class="cp-module-card" data-cp="billing" type="button"><span class="cp-num">09</span><strong>NTCoins / Billing</strong><p>Camada de créditos, checkout e medição comercial.</p><small>Ver situação</small></button>
      </div>

      <section id="cpDetalhes" class="cp-detail oculto">
        <div class="cp-detail-header">
          <div><span class="eyebrow">DETALHES</span><h3 id="cpDetalheTitulo">Control Plane</h3></div>
          <button id="cpFecharDetalhe" class="btn-secondary" type="button">Fechar</button>
        </div>
        <div id="cpDetalheConteudo" class="cp-detail-grid"></div>
      </section>

      <section class="cp-events">
        <div class="cp-events-header">
          <div><span class="eyebrow">EVENTOS</span><h3>Atividade do sistema</h3></div>
          <button id="btnLimparEventos" class="btn-secondary" type="button">Limpar</button>
        </div>
        <div id="controlEventos" class="cp-event-list"></div>
      </section>
    `;

    return true;
  }

  function setTexto(id, texto, classe = "") {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = texto;
    if (classe) el.className = classe;
  }

  async function requisitarJson(caminho, autenticado = false) {
    const headers = {};
    if (autenticado) {
      if (!token()) throw new Error("Sessão não autenticada.");
      headers.Authorization = `Bearer ${token()}`;
    }

    const resposta = await fetch(`${apiBase()}${caminho}`, { headers, cache: "no-store" });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.erro || `HTTP ${resposta.status}`);
    return dados;
  }

  async function carregar() {
    const botao = document.getElementById("btnAtualizarControlPlane");
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Verificando...";
    }

    setTexto("cpApi", "Verificando...");
    setTexto("cpBanco", "Verificando...");
    setTexto("cpLatencia", "— ms");

    const inicio = performance.now();

    try {
      estado.health = await requisitarJson("/api/health");
      estado.latenciaMs = Math.max(0, Math.round(performance.now() - inicio));

      const apiOnline = estado.health?.api === "online";
      const bancoOnline = String(estado.health?.banco || "").toLowerCase() === "conectado";

      setTexto("cpApi", apiOnline ? "Online" : "Indisponível", apiOnline ? "cp-status-ok" : "cp-status-erro");
      setTexto("cpBanco", bancoOnline ? "Conectado" : (estado.health?.banco || "Indisponível"), bancoOnline ? "cp-status-ok" : "cp-status-erro");
      setTexto("cpLatencia", `${estado.latenciaMs} ms`, estado.latenciaMs < 1000 ? "cp-status-ok" : "cp-status-warn");
      setTexto("cpApiSub", dataHora(estado.health?.horario));
      setTexto("cpBancoSub", bancoOnline ? "Consulta SELECT 1 confirmada pela API" : "Falha reportada pela API");

      registrar(`Core API respondeu em ${estado.latenciaMs} ms.`, apiOnline && bancoOnline ? "ok" : "erro");
    } catch (erro) {
      estado.health = null;
      estado.latenciaMs = null;
      setTexto("cpApi", "Offline", "cp-status-erro");
      setTexto("cpBanco", "Não verificado", "cp-status-warn");
      setTexto("cpLatencia", "— ms");
      registrar(`Falha no health check: ${erro.message}`, "erro");
    }

    if (token()) {
      const resultados = await Promise.allSettled([
        requisitarJson("/api/control-plane", true),
        requisitarJson("/api/auth/me", true)
      ]);

      if (resultados[0].status === "fulfilled") {
        estado.control = resultados[0].value;
        registrar("Control Plane autenticado atualizado.", "ok");
      } else {
        estado.control = null;
        registrar(`Control Plane: ${resultados[0].reason.message}`, "erro");
      }

      if (resultados[1].status === "fulfilled") {
        estado.me = resultados[1].value;
      } else {
        estado.me = null;
        registrar(`Sessão: ${resultados[1].reason.message}`, "erro");
      }
    } else {
      estado.control = null;
      estado.me = null;
      registrar("Health público atualizado; login necessário para dados privados.");
    }

    estado.atualizadoEm = new Date().toISOString();
    atualizarResumos();

    if (botao) {
      botao.disabled = false;
      botao.textContent = "Atualizar status";
    }
  }

  function atualizarResumos() {
    const control = estado.control || {};
    const me = estado.me || {};
    const keys = Array.isArray(control.apiKeys) ? control.apiKeys : [];
    const ativas = keys.filter(k => k.ativo && !k.revogado_em).length;
    const perfis = Array.isArray(me.perfis) ? me.perfis.join(" · ") : "—";

    setTexto("cpSegResumo", token() ? `Sessão autenticada · ${perfis}` : "Login necessário");
    setTexto("cpKeysResumo", token() ? `${ativas} ativa(s) · ${keys.length} total` : "Login necessário");
    setTexto("cpMultiResumo", token() ? `org ${me.organizacaoId ?? "—"} · fazenda ${me.fazendaId ?? "—"}` : "Login necessário");

    const consumo = control.consumo || {};
    setTexto("cpMeterResumo", token() ? `${numero(consumo.requisicoes_24h)} req/24h` : "Login necessário");
    setTexto("cpTrafego", token() ? `${numero(consumo.requisicoes_24h)} req/24h · ${numero(consumo.total_requisicoes)} total` : "Metering requer login");
  }

  function item(rotulo, valor) {
    return `<div class="cp-detail-item"><span>${escapar(rotulo)}</span><strong>${escapar(valor)}</strong></div>`;
  }

  function abrirDetalhe(tipo) {
    const painel = document.getElementById("cpDetalhes");
    const titulo = document.getElementById("cpDetalheTitulo");
    const conteudo = document.getElementById("cpDetalheConteudo");
    if (!painel || !titulo || !conteudo) return;

    const h = estado.health || {};
    const c = estado.control || {};
    const me = estado.me || {};
    const keys = Array.isArray(c.apiKeys) ? c.apiKeys : [];
    const scopes = [...new Set(keys.flatMap(k => Array.isArray(k.scopes) ? k.scopes : []))];
    const consumo = c.consumo || {};

    const detalhes = {
      core: ["Core API", [item("Status", h.api === "online" ? "Online" : "Não confirmado"), item("Endpoint", `${apiBase()}/api/health`), item("Última resposta", dataHora(h.horario)), item("Última atualização do Console", dataHora(estado.atualizadoEm))]],
      banco: ["PostgreSQL", [item("Conexão", h.banco || "Não verificada"), item("Verificação", h.banco === "conectado" ? "SELECT 1 confirmado" : "Sem confirmação"), item("Escopo", "Banco da API NexoTerraCore"), item("Segredos", "Não exibidos no Console")]],
      latencia: ["Latência & Tráfego", [item("Latência do health", estado.latenciaMs == null ? "—" : `${estado.latenciaMs} ms`), item("Requisições 24h", token() ? numero(consumo.requisicoes_24h) : "Login necessário"), item("Requisições totais", token() ? numero(consumo.total_requisicoes) : "Login necessário"), item("Último consumo", token() ? dataHora(consumo.ultimo_consumo_em) : "Login necessário")]],
      seguranca: ["Segurança & Sessões", [item("Autenticação", token() ? "Sessão Bearer ativa no Console" : "Não autenticado"), item("Perfis", Array.isArray(me.perfis) ? me.perfis.join(", ") : "—"), item("Rate limit API Key", c.rateLimit ? `${c.rateLimit.limite} req/${c.rateLimit.janelaSegundos}s` : "Não carregado"), item("Dados sensíveis", "Tokens e segredos não são exibidos")]],
      apikeys: ["API Keys & Scopes", [item("Chaves cadastradas", token() ? numero(keys.length) : "Login necessário"), item("Chaves ativas", token() ? numero(keys.filter(k => k.ativo && !k.revogado_em).length) : "Login necessário"), item("Scopes", token() ? (scopes.join(", ") || "Nenhum scope informado") : "Login necessário"), item("Último uso", token() ? dataHora(keys.map(k => k.ultimo_uso_em).filter(Boolean).sort().at(-1)) : "Login necessário")]],
      multitenancy: ["Multitenancy", [item("organização_id", me.organizacaoId ?? "—"), item("fazenda_id", me.fazendaId ?? "—"), item("Organização", c.organizacao?.nome || "—"), item("Isolamento", token() ? "Contexto autenticado por organização/fazenda" : "Login necessário")]],
      metering: ["Consumo & Metering", [item("Total registrado", token() ? numero(consumo.total_requisicoes) : "Login necessário"), item("Últimas 24h", token() ? numero(consumo.requisicoes_24h) : "Login necessário"), item("Último consumo", token() ? dataHora(consumo.ultimo_consumo_em) : "Login necessário"), item("Fonte", "/api/control-plane → api_usage")]],
      integracoes: ["Integrações", [item("Turing", document.getElementById("view-turing") ? "Interface integrada ao Console" : "Não detectado"), item("NTCoins / PayPal", "Integração existe no ecossistema; status operacional não é exposto por /api/control-plane"), item("Maps / Earth", "Status operacional não exposto por /api/control-plane"), item("Satélite / Telemetria", "Não verificados automaticamente")]],
      deploy: ["Deploy & Infraestrutura", [item("API", apiBase()), item("Host da API", (() => { try { return new URL(apiBase()).hostname; } catch { return "—"; } })()), item("Host do Console", window.location.hostname), item("Ambiente", window.location.hostname.includes("localhost") ? "Local" : "Publicado")]],
      auditoria: ["Auditoria & Eventos", [item("Eventos locais desta sessão", numero(estado.eventos.length)), item("Auditoria persistente", "Existe no backend; ainda sem endpoint dedicado nesta tela"), item("Última atualização", dataHora(estado.atualizadoEm)), item("Ação", "Os eventos abaixo registram as verificações feitas por este Control Plane")]],
      migrations: ["Migrations & Banco", [item("Banco", h.banco || "Não verificado"), item("Controle de migrations", "schema_migrations existe no backend"), item("Lista de migrations", "Ainda não exposta pelo endpoint /api/control-plane"), item("Próxima evolução", "Expor somente versão/data, sem dados sensíveis")]],
      billing: ["NTCoins / Billing", [item("Camada", "NTCoins integrada ao backend"), item("Metering de API", token() ? `${numero(consumo.total_requisicoes)} requisições registradas` : "Login necessário"), item("Checkout / PayPal", "Status específico não exposto por /api/control-plane"), item("Segurança", "Credenciais e segredos não são exibidos")]]
    };

    const selecionado = detalhes[tipo] || ["Control Plane", [item("Estado", "Selecione um módulo")]];
    titulo.textContent = selecionado[0];
    conteudo.innerHTML = selecionado[1].join("");
    painel.classList.remove("oculto");
    painel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderEventos() {
    const alvo = document.getElementById("controlEventos");
    if (!alvo) return;

    if (!estado.eventos.length) {
      alvo.innerHTML = `<div class="cp-event">Nenhum evento nesta sessão.</div>`;
      return;
    }

    alvo.innerHTML = estado.eventos
      .map(e => `<div class="cp-event ${e.tipo === "erro" ? "erro" : e.tipo === "ok" ? "ok" : ""}">[${escapar(new Date(e.em).toLocaleTimeString("pt-BR"))}] ${escapar(e.texto)}</div>`)
      .join("");
  }

  function configurar() {
    document.getElementById("btnAtualizarControlPlane")?.addEventListener("click", carregar);
    document.getElementById("btnLimparEventos")?.addEventListener("click", () => {
      estado.eventos = [];
      renderEventos();
    });
    document.getElementById("cpFecharDetalhe")?.addEventListener("click", () => {
      document.getElementById("cpDetalhes")?.classList.add("oculto");
    });
    document.getElementById("view-api")?.addEventListener("click", evento => {
      const card = evento.target.closest("[data-cp]");
      if (card) abrirDetalhe(card.dataset.cp);
    });

    document.querySelector('.menu-item[data-view="api"]')?.addEventListener("click", () => {
      setTimeout(carregar, 40);
    });
  }

  function iniciar() {
    instalarEstilo();
    if (!montarTela()) return;
    configurar();
    renderEventos();
    registrar("Control Plane operacional carregado.", "ok");

    if (document.querySelector('.menu-item[data-view="api"]')?.classList.contains("ativo")) {
      carregar();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
