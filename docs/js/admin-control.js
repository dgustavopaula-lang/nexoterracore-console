(() => {
  const API_PATH = "/api/financeiro/admin-workspace";
  const LOCAL_KEY = "nexoterracore.admin.workspace.v2";

  const MODULOS = [
    { id:"agro-digital", n:"01", titulo:"Agro Digital", subtitulo:"AgroCore / operação agro", descricao:"Projeto agro, fazendas, rastreabilidade, telemetria, clientes e evolução comercial.", view:"projetos" },
    { id:"turing", n:"02", titulo:"Turing", subtitulo:"Aplicativo de inteligência artificial", descricao:"Produto público de IA, experiência mobile, API, NTCoins e evolução do agente Turing.", view:"turing" },
    { id:"mercado-financeiro", n:"03", titulo:"Mercado Financeiro", subtitulo:"Análise econômica e estratégica", descricao:"Indicadores, cenários, ativos, estudos econômicos, riscos, oportunidades e decisões." },
    { id:"programacao", n:"04", titulo:"Programação", subtitulo:"Engenharia e desenvolvimento", descricao:"Backlog técnico, APIs, frontend, PostgreSQL, segurança, testes, deploy e manutenção." },
    { id:"sistema-raiz", n:"05", titulo:"Sistema Raiz", subtitulo:"SaaS multi-setor", descricao:"Clínica, Academia, Agro, Hotel, Imobiliária e demais verticais comerciais." },
    { id:"financeiro", n:"06", titulo:"Finanças", subtitulo:"Financeiro / Contabilidade", descricao:"Receitas, despesas, fluxo de caixa, lançamentos e acompanhamento financeiro.", view:"financeiro" },
    { id:"agenda", n:"07", titulo:"Agenda / Calendário", subtitulo:"Compromissos e planejamento", descricao:"Reuniões, contatos, entregas, prazos e planejamento diário e semanal." },
    { id:"projetos", n:"08", titulo:"Projetos", subtitulo:"Portfólio geral", descricao:"Controle de projetos, prioridades, estágios, prazos, links e próximas ações." },
    { id:"loteamento", n:"09", titulo:"Projeto Loteamento", subtitulo:"Desenvolvimento imobiliário", descricao:"Planejamento, documentação, contatos, cronograma, empresas e execução do projeto de loteamento." },
    { id:"campanha-goias", n:"10", titulo:"Projeto Campanha", subtitulo:"Lançamento · Goiás", descricao:"Planejamento do lançamento Campanha na região de Goiás, contatos, comunicação, cronograma e execução." },
    { id:"empresas-contatos", n:"11", titulo:"Empresas e Contatos", subtitulo:"E-mail · WhatsApp · mensagens", descricao:"Cadastro operacional de empresas, responsáveis, e-mails, WhatsApp, projeto relacionado e mensagens.", contatos:true }
  ];

  function localLer() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}") || {}; }
    catch (_) { return {}; }
  }

  function localSalvar(estado) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(estado));
  }

  function escapar(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function token() {
    return (typeof SalaDeComando !== "undefined" && SalaDeComando.token) || window.nexoAuthToken || null;
  }

  function apiBase() {
    return typeof SalaDeComando !== "undefined"
      ? SalaDeComando.apiBase
      : "https://nexoterracore-api.onrender.com";
  }

  async function api(caminho, opcoes = {}) {
    if (!token()) throw new Error("Sessão não autenticada.");

    const resposta = await fetch(`${apiBase()}${API_PATH}${caminho}`, {
      ...opcoes,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
        ...(opcoes.headers || {})
      }
    });

    const dados = resposta.status === 204 ? null : await resposta.json();
    if (!resposta.ok) throw new Error(dados?.erro || `HTTP ${resposta.status}`);
    return dados;
  }

  function padrao(modulo) {
    return {
      titulo: modulo.titulo,
      subtitulo: modulo.subtitulo,
      status: "Em desenvolvimento",
      prioridade: "Alta",
      proximaAcao: "",
      prazo: "",
      link: "",
      repositorio: "",
      responsavel: "Gustavo",
      notas: modulo.descricao
    };
  }

  async function carregarModulo(modulo) {
    try {
      const r = await api(`/modulos/${modulo.id}`);
      return { ...padrao(modulo), ...(r?.dados || {}) };
    } catch (_) {
      return { ...padrao(modulo), ...(localLer().modulos?.[modulo.id] || {}) };
    }
  }

  async function salvarModulo(modulo, dados) {
    try {
      await api(`/modulos/${modulo.id}`, {
        method: "PUT",
        body: JSON.stringify(dados)
      });
      return "Salvo no PostgreSQL.";
    } catch (_) {
      const estado = localLer();
      estado.modulos = estado.modulos || {};
      estado.modulos[modulo.id] = dados;
      localSalvar(estado);
      return "Salvo neste navegador. Quando a API estiver disponível, o banco será usado.";
    }
  }

  function instalarEstilo() {
    if (document.getElementById("adminControlStyle")) return;

    const style = document.createElement("style");
    style.id = "adminControlStyle";
    style.textContent = `
      .admin-live-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:24px}
      .admin-live-card{width:100%;min-height:160px;text-align:left;background:linear-gradient(135deg,#0b2020,#07181b);border:1px solid #123b39;border-radius:18px;padding:28px 30px;color:inherit;cursor:pointer;transition:.18s ease;display:flex;align-items:flex-start;gap:24px}
      .admin-live-card:hover{transform:translateY(-2px);border-color:#00d99b;box-shadow:0 10px 28px rgba(0,0,0,.16)}
      .admin-live-card .num{width:54px;height:54px;flex:none;border-radius:14px;border:1px solid rgba(0,217,155,.35);background:rgba(0,217,155,.08);display:flex;align-items:center;justify-content:center;font-family:monospace;color:#00efb0;font-weight:700}
      .admin-live-card .card-copy{display:block}.admin-live-card strong{display:block;font-size:22px;margin:2px 0 8px}.admin-live-card small{display:block;color:#8ba0a4;line-height:1.45;font-size:15px}
      .admin-editor{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:16px}
      .admin-editor label{display:flex;flex-direction:column;gap:7px;font-size:12px;color:#9a948d}
      .admin-editor input,.admin-editor select,.admin-editor textarea{width:100%;background:#0b0d0f;border:1px solid #292c30;border-radius:9px;color:#ece7e1;padding:11px 12px;font:inherit}
      .admin-editor textarea{min-height:150px;resize:vertical}.admin-span-2{grid-column:1/-1}.admin-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.admin-feedback{font-size:12px;color:#8c867f;margin-top:10px}
      .contact-list{display:grid;gap:10px;margin-top:16px}.contact-row{border:1px solid #292c30;border-radius:10px;padding:12px;background:#0d0f11}.contact-row strong{display:block}.contact-row small{color:#8c867f}.contact-actions{display:flex;gap:8px;margin-top:9px;flex-wrap:wrap}
      @media(max-width:900px){.admin-live-grid{grid-template-columns:1fr}.admin-editor{grid-template-columns:1fr}.admin-span-2{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  function abrirView(view) {
    document.querySelector(`.menu-item[data-view="${view}"]`)?.click();
  }

  async function editorModulo(modulo) {
    const workspace = document.getElementById("adminWorkspace");
    const titulo = document.getElementById("adminTitulo");
    const conteudo = document.getElementById("adminConteudo");
    if (!workspace || !titulo || !conteudo) return;

    const dados = await carregarModulo(modulo);
    titulo.textContent = modulo.titulo;

    conteudo.innerHTML = `
      <form id="adminEditorForm" class="admin-editor">
        <label>Título<input name="titulo" value="${escapar(dados.titulo)}"></label>
        <label>Subtítulo<input name="subtitulo" value="${escapar(dados.subtitulo)}"></label>
        <label>Status<select name="status">${["Planejamento","Em desenvolvimento","Em teste","Publicado","Pausado","Concluído"].map(v => `<option ${dados.status===v?"selected":""}>${v}</option>`).join("")}</select></label>
        <label>Prioridade<select name="prioridade">${["Baixa","Normal","Alta","Crítica"].map(v => `<option ${dados.prioridade===v?"selected":""}>${v}</option>`).join("")}</select></label>
        <label>Responsável<input name="responsavel" value="${escapar(dados.responsavel)}"></label>
        <label>Prazo<input name="prazo" type="date" value="${escapar(dados.prazo)}"></label>
        <label class="admin-span-2">Próxima ação<input name="proximaAcao" value="${escapar(dados.proximaAcao)}" placeholder="A próxima execução concreta"></label>
        <label>Link / página<input name="link" value="${escapar(dados.link)}" placeholder="https://..."></label>
        <label>Repositório / pasta<input name="repositorio" value="${escapar(dados.repositorio)}" placeholder="~/Projetos/..."></label>
        <label class="admin-span-2">Notas, estratégia e instruções<textarea name="notas">${escapar(dados.notas)}</textarea></label>
      </form>
      <div class="admin-actions">
        <button id="adminSalvar" class="btn-primary" type="button">Salvar alterações</button>
        ${modulo.view ? `<button id="adminAbrirModulo" class="btn-secondary" type="button">Abrir módulo</button>` : ""}
        <button id="adminAbrirLink" class="btn-secondary" type="button">Abrir link informado</button>
      </div>
      <div id="adminFeedback" class="admin-feedback">Área editável pelo proprietário.</div>
    `;

    workspace.classList.remove("oculto");
    workspace.scrollIntoView({ behavior: "smooth", block: "start" });

    document.getElementById("adminSalvar")?.addEventListener("click", async () => {
      const form = document.getElementById("adminEditorForm");
      const novosDados = Object.fromEntries(new FormData(form));
      document.getElementById("adminFeedback").textContent = await salvarModulo(modulo, novosDados);
      await montarCards();
    });

    document.getElementById("adminAbrirModulo")?.addEventListener("click", () => abrirView(modulo.view));

    document.getElementById("adminAbrirLink")?.addEventListener("click", () => {
      const link = document.getElementById("adminEditorForm")?.elements?.link?.value?.trim();
      if (!link) return alert("Informe um link.");
      try {
        window.open(new URL(link, window.location.href).href, "_blank", "noopener,noreferrer");
      } catch (_) {
        alert("Link inválido.");
      }
    });
  }

  async function contatosLer() {
    try { return await api("/contatos"); }
    catch (_) { return localLer().contatos || []; }
  }

  async function contatosSalvar(lista) {
    const estado = localLer();
    estado.contatos = lista;
    localSalvar(estado);
  }

  async function editorContatos() {
    const workspace = document.getElementById("adminWorkspace");
    const titulo = document.getElementById("adminTitulo");
    const conteudo = document.getElementById("adminConteudo");
    if (!workspace || !titulo || !conteudo) return;

    titulo.textContent = "Empresas e Contatos";
    conteudo.innerHTML = `
      <form id="contatoForm" class="admin-editor">
        <input type="hidden" name="id">
        <label>Empresa<input name="empresa" required></label>
        <label>Responsável<input name="responsavel"></label>
        <label>E-mail<input name="email" type="email"></label>
        <label>WhatsApp<input name="whatsapp" placeholder="+55 ..."></label>
        <label>Projeto<select name="projeto"><option>Agro Digital</option><option>Turing</option><option>Mercado Financeiro</option><option>Sistema Raiz</option><option>Projeto Loteamento</option><option>Projeto Campanha · Goiás</option><option>Outro</option></select></label>
        <label>Status<select name="status"><option>Novo</option><option>Contato iniciado</option><option>Aguardando resposta</option><option>Reunião</option><option>Proposta</option><option>Cliente / Parceiro</option></select></label>
        <label class="admin-span-2">Mensagem<textarea name="mensagem" placeholder="Escreva aqui a mensagem de e-mail ou WhatsApp..."></textarea></label>
      </form>
      <div class="admin-actions">
        <button id="contatoSalvar" class="btn-primary" type="button">Salvar contato</button>
        <button id="contatoNovo" class="btn-secondary" type="button">Novo</button>
      </div>
      <div id="contatoFeedback" class="admin-feedback"></div>
      <div id="contactList" class="contact-list"></div>
    `;

    workspace.classList.remove("oculto");
    workspace.scrollIntoView({ behavior: "smooth", block: "start" });

    async function render() {
      const lista = await contatosLer();
      const alvo = document.getElementById("contactList");
      alvo.innerHTML = lista.length
        ? lista.map((x, i) => `
          <div class="contact-row">
            <strong>${escapar(x.empresa)}</strong>
            <small>${escapar(x.responsavel || "")} · ${escapar(x.email || "")} · ${escapar(x.whatsapp || "")} · ${escapar(x.projeto || "")}</small>
            <div class="contact-actions">
              <button class="btn-secondary" data-edit-contact="${x.id ?? i}" type="button">Editar</button>
              <button class="btn-secondary" data-del-contact="${x.id ?? i}" type="button">Excluir</button>
            </div>
          </div>
        `).join("")
        : `<div class="admin-feedback">Nenhum contato cadastrado.</div>`;
    }

    document.getElementById("contatoNovo")?.addEventListener("click", () => {
      document.getElementById("contatoForm").reset();
    });

    document.getElementById("contatoSalvar")?.addEventListener("click", async () => {
      const form = document.getElementById("contatoForm");
      const dados = Object.fromEntries(new FormData(form));
      if (!dados.empresa.trim()) return alert("Informe a empresa.");

      try {
        const id = dados.id;
        delete dados.id;
        await api(id ? `/contatos/${id}` : "/contatos", {
          method: id ? "PUT" : "POST",
          body: JSON.stringify(dados)
        });
        document.getElementById("contatoFeedback").textContent = "Contato salvo no PostgreSQL.";
      } catch (_) {
        const lista = await contatosLer();
        const id = dados.id || Date.now();
        const item = { ...dados, id };
        const indice = lista.findIndex(x => String(x.id) === String(id));
        if (indice >= 0) lista[indice] = item;
        else lista.unshift(item);
        await contatosSalvar(lista);
        document.getElementById("contatoFeedback").textContent = "Contato salvo neste navegador.";
      }

      form.reset();
      await render();
    });

    document.getElementById("contactList")?.addEventListener("click", async evento => {
      const editar = evento.target.closest("[data-edit-contact]");
      const excluir = evento.target.closest("[data-del-contact]");
      const lista = await contatosLer();

      if (editar) {
        const item = lista.find((x, i) => String(x.id ?? i) === editar.dataset.editContact);
        if (!item) return;
        const form = document.getElementById("contatoForm");
        for (const [k, v] of Object.entries(item)) {
          if (form.elements[k]) form.elements[k].value = v ?? "";
        }
      }

      if (excluir) {
        const id = excluir.dataset.delContact;
        try {
          await api(`/contatos/${id}`, { method: "DELETE" });
        } catch (_) {
          await contatosSalvar(lista.filter((x, i) => String(x.id ?? i) !== id));
        }
        await render();
      }
    });

    await render();
  }

  async function montarCards() {
    const grid = document.getElementById("adminLiveGrid");
    if (!grid) return;

    const cards = [];
    for (const modulo of MODULOS) {
      const dados = modulo.contatos ? null : await carregarModulo(modulo);
      cards.push(`
        <button class="admin-live-card" data-admin-live="${modulo.id}" type="button">
          <span class="num">${modulo.n}</span>
          <span class="card-copy">
            <strong>${escapar(dados?.titulo || modulo.titulo)}</strong>
            <small>${escapar(dados?.subtitulo || modulo.subtitulo)}${dados?.status ? ` · ${escapar(dados.status)}` : ""}</small>
          </span>
        </button>
      `);
    }
    grid.innerHTML = cards.join("");
  }

  async function iniciar() {
    instalarEstilo();

    const view = document.getElementById("view-administracao");
    if (!view) return;

    view.querySelector(".overview-grid")?.remove();
    view.querySelector(".admin-grid")?.remove();

    const descricao = view.querySelector(".section-header p");
    if (descricao) {
      descricao.textContent = "Central operacional do proprietário: projetos, produtos, finanças, agenda, programação, mercado e contatos.";
    }

    let grid = document.getElementById("adminLiveGrid");
    if (!grid) {
      grid = document.createElement("div");
      grid.id = "adminLiveGrid";
      grid.className = "admin-live-grid";
      const workspace = document.getElementById("adminWorkspace");
      workspace ? view.insertBefore(grid, workspace) : view.appendChild(grid);
    }

    await montarCards();

    grid.addEventListener("click", evento => {
      const botao = evento.target.closest("[data-admin-live]");
      if (!botao) return;
      const modulo = MODULOS.find(x => x.id === botao.dataset.adminLive);
      if (!modulo) return;
      modulo.contatos ? editorContatos() : editorModulo(modulo);
    });

    document.getElementById("btnFecharAdmin")?.addEventListener("click", () => {
      document.getElementById("adminWorkspace")?.classList.add("oculto");
    });

    console.log("NexoTerraCore Administração operacional carregada");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
