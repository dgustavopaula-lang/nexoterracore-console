(() => {
  const STORAGE = "nexoterracore.projetos.v1";

  const iniciais = [
    {id:"nexoterracore",nome:"NexoTerraCore",status:"Em desenvolvimento",prioridade:"Crítica",evolucao:75,proxima:"Infraestrutura VPS e segurança"},
    {id:"turing",nome:"Turing",status:"Em desenvolvimento",prioridade:"Alta",evolucao:65,proxima:"Ampliar inteligência e perguntas"},
    {id:"agro-digital-pro",nome:"Agro Digital Pro",status:"Em desenvolvimento",prioridade:"Alta",evolucao:55,proxima:"Rastreabilidade animal"},
    {id:"sistema-raiz",nome:"Sistema Raiz",status:"Em desenvolvimento",prioridade:"Normal",evolucao:45,proxima:"Consolidar verticais"},
    {id:"campanha",nome:"Projeto Campanha / Loteamento",status:"Planejamento",prioridade:"Alta",evolucao:20,proxima:"Documentação e estrutura"},
    {id:"clinica",nome:"Clínica",status:"Em desenvolvimento",prioridade:"Normal",evolucao:40,proxima:"Entrega e publicação"}
  ];

  const ler = () => {
    try {
      const x = JSON.parse(localStorage.getItem(STORAGE));
      if (x && Array.isArray(x.projetos)) return x;
    } catch (_) {}
    return {projetos:[...iniciais],registros:[]};
  };

  const salvar = x => localStorage.setItem(STORAGE, JSON.stringify(x));

  const esc = v => String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");

  const dataHoje = () => new Date().toISOString().slice(0,10);

  function modal(titulo, conteudo) {
    let m = document.getElementById("projModal");

    if (!m) {
      m = document.createElement("div");
      m.id = "projModal";
      m.className = "modal oculto";
      m.innerHTML = `
        <div class="modal-card modal-card-wide">
          <div class="modal-header">
            <h2 id="projModalTitulo"></h2>
            <button id="projFechar" class="btn-icon" type="button">×</button>
          </div>
          <div id="projModalConteudo"></div>
        </div>`;
      document.body.appendChild(m);
      document.getElementById("projFechar").onclick =
        () => m.classList.add("oculto");
    }

    document.getElementById("projModalTitulo").textContent = titulo;
    document.getElementById("projModalConteudo").innerHTML = conteudo;
    m.classList.remove("oculto");
  }

  function projetoForm(id=null) {
    const estado = ler();
    const p = estado.projetos.find(x => x.id === id) || {};

    modal(id ? "Editar projeto" : "Novo projeto", `
      <form id="formProjeto" class="form-grid">
        <input type="hidden" name="id" value="${esc(p.id || "")}">

        <label>Projeto
          <input name="nome" required value="${esc(p.nome || "")}">
        </label>

        <label>Status
          <select name="status">
            ${["Planejamento","Em desenvolvimento","Em teste","Publicado","Pausado","Concluído"]
              .map(x=>`<option ${p.status===x?"selected":""}>${x}</option>`).join("")}
          </select>
        </label>

        <label>Prioridade
          <select name="prioridade">
            ${["Baixa","Normal","Alta","Crítica"]
              .map(x=>`<option ${p.prioridade===x?"selected":""}>${x}</option>`).join("")}
          </select>
        </label>

        <label>Evolução %
          <input name="evolucao" type="number" min="0" max="100"
                 value="${Number(p.evolucao || 0)}">
        </label>

        <label class="form-span-2">Próxima ação
          <input name="proxima" value="${esc(p.proxima || "")}">
        </label>
      </form>

      <button id="salvarProjeto" class="btn-primary btn-full" type="button">
        Salvar projeto
      </button>
    `);

    document.getElementById("salvarProjeto").onclick = () => {
      const f = Object.fromEntries(new FormData(document.getElementById("formProjeto")));
      const x = ler();

      const novoId = f.id || (
        f.nome.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
          .replace(/[^a-z0-9]+/g,"-")
          .replace(/^-|-$/g,"") + "-" + Date.now()
      );

      const item = {
        id:novoId,
        nome:f.nome.trim(),
        status:f.status,
        prioridade:f.prioridade,
        evolucao:Math.max(0,Math.min(100,Number(f.evolucao || 0))),
        proxima:f.proxima.trim()
      };

      const i = x.projetos.findIndex(y=>y.id===novoId);
      if (i >= 0) x.projetos[i] = item;
      else x.projetos.push(item);

      salvar(x);
      document.getElementById("projModal").classList.add("oculto");
      render();
    };
  }

  function registroForm(projetoId="") {
    const estado = ler();

    modal("Novo registro diário", `
      <form id="formRegistro" class="form-grid">
        <label>Projeto
          <select name="projetoId">
            ${estado.projetos.map(p =>
              `<option value="${esc(p.id)}" ${p.id===projetoId?"selected":""}>${esc(p.nome)}</option>`
            ).join("")}
          </select>
        </label>

        <label>Data
          <input name="data" type="date" value="${dataHoje()}">
        </label>

        <label class="form-span-2">Evolução realizada
          <textarea name="texto" rows="5" required
            placeholder="O que foi realizado hoje?"></textarea>
        </label>

        <label class="form-span-2">Próxima ação
          <input name="proxima" placeholder="Próximo passo concreto">
        </label>
      </form>

      <button id="salvarRegistro" class="btn-primary btn-full" type="button">
        Salvar registro diário
      </button>
    `);

    document.getElementById("salvarRegistro").onclick = () => {
      const f = Object.fromEntries(new FormData(document.getElementById("formRegistro")));
      const x = ler();

      x.registros.push({
        id:Date.now(),
        projetoId:f.projetoId,
        data:f.data || dataHoje(),
        texto:f.texto.trim(),
        proxima:f.proxima.trim()
      });

      const p = x.projetos.find(y=>y.id===f.projetoId);
      if (p && f.proxima.trim()) p.proxima = f.proxima.trim();

      salvar(x);
      document.getElementById("projModal").classList.add("oculto");
      render();
    };
  }

  function exportar() {
    const blob = new Blob(
      [JSON.stringify(ler(),null,2)],
      {type:"application/json"}
    );

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nexoterracore-projetos-${dataHoje()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function render() {
    const x = ler();
    const grid = document.getElementById("projetosGrid");
    const hist = document.getElementById("registroDiarioLista");

    if (!grid || !hist) return;

    document.getElementById("projTotal").textContent = x.projetos.length;
    document.getElementById("projAtivos").textContent =
      x.projetos.filter(p=>!["Pausado","Concluído"].includes(p.status)).length;
    document.getElementById("projHoje").textContent =
      x.registros.filter(r=>r.data===dataHoje()).length;

    grid.innerHTML = x.projetos.map(p=>`
      <article class="operation-panel">
        <h3>${esc(p.nome)}</h3>
        <p>${esc(p.status)} · Prioridade ${esc(p.prioridade)}</p>
        <strong>${Number(p.evolucao || 0)}%</strong>
        <p>Próxima ação</p>
        <strong>${esc(p.proxima || "Definir próxima ação")}</strong>
        <div class="admin-actions">
          <button class="btn-secondary" data-edit="${esc(p.id)}" type="button">Editar</button>
          <button class="btn-primary" data-log="${esc(p.id)}" type="button">Registro diário</button>
        </div>
      </article>
    `).join("");

    const regs = [...x.registros].reverse();

    hist.innerHTML = regs.length ? regs.map(r=>{
      const p=x.projetos.find(z=>z.id===r.projetoId);
      return `
        <div class="control-event">
          <strong>${esc(r.data)} · ${esc(p?.nome || "Projeto")}</strong><br>
          ${esc(r.texto)}
          ${r.proxima ? `<br><small>Próxima ação: ${esc(r.proxima)}</small>` : ""}
        </div>`;
    }).join("") : '<div class="control-event">Nenhum registro cadastrado.</div>';

    grid.querySelectorAll("[data-edit]").forEach(b =>
      b.onclick=()=>projetoForm(b.dataset.edit)
    );

    grid.querySelectorAll("[data-log]").forEach(b =>
      b.onclick=()=>registroForm(b.dataset.log)
    );
  }

  document.addEventListener("DOMContentLoaded",()=>{
    document.getElementById("btnNovoProjeto")?.addEventListener("click",()=>projetoForm());
    document.getElementById("btnNovoRegistro")?.addEventListener("click",()=>registroForm());
    document.getElementById("btnBackupProjetos")?.addEventListener("click",exportar);
    render();
  });
})();
