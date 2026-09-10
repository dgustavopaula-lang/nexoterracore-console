(() => {
  "use strict";

  const STORAGE = "nexoterracore.contas.seguranca.v1";

  function ler() {
    try {
      const dados = JSON.parse(localStorage.getItem(STORAGE) || "{}");
      return Array.isArray(dados.contas) ? dados : { contas: [] };
    } catch (_) {
      return { contas: [] };
    }
  }

  function salvar(dados) {
    localStorage.setItem(STORAGE, JSON.stringify(dados));
  }

  function esc(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function hoje() {
    return new Date().toISOString().slice(0, 10);
  }

  function validarLink(link) {
    if (!link) return "";
    try {
      const u = new URL(link);
      return u.protocol === "https:" ? u.href : "";
    } catch (_) {
      return "";
    }
  }

  function criarModal() {
    if (document.getElementById("segModal")) return;

    const modal = document.createElement("div");
    modal.id = "segModal";
    modal.className = "modal oculto";

    modal.innerHTML = `
      <div class="modal-card modal-card-wide">
        <div class="modal-header">
          <div>
            <span class="eyebrow">CONTAS / SEGURANÇA</span>
            <h2 id="segModalTitulo">Conta</h2>
          </div>

          <button id="segModalFechar"
                  class="btn-icon"
                  type="button">×</button>
        </div>

        <div class="notice">
          Nunca digite sua senha aqui.
          A senha real deve permanecer somente no gerenciador de senhas.
        </div>

        <div id="segModalConteudo"></div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("segModalFechar")
      .addEventListener("click", () => {
        modal.classList.add("oculto");
      });
  }

  function abrirEditor(id = null) {
    criarModal();

    const estado = ler();
    const atual = estado.contas.find(x => x.id === id) || {};

    document.getElementById("segModalTitulo").textContent =
      id ? "Editar conta" : "Nova conta";

    document.getElementById("segModalConteudo").innerHTML = `
      <form id="segForm" class="form-grid">

        <input type="hidden"
               name="id"
               value="${esc(atual.id || "")}">

        <label>
          Serviço
          <input
            name="servico"
            required
            placeholder="Gmail, HostGator, GitHub..."
            value="${esc(atual.servico || "")}">
        </label>

        <label>
          Conta / e-mail
          <input
            name="conta"
            autocomplete="off"
            placeholder="nome da conta ou e-mail"
            value="${esc(atual.conta || "")}">
        </label>

        <label>
          Forma de acesso
          <select name="acesso">
            ${[
              "Login próprio",
              "Entrar com Google",
              "Não sei / revisar"
            ].map(v =>
              `<option ${atual.acesso === v ? "selected" : ""}>${v}</option>`
            ).join("")}
          </select>
        </label>

        <label>
          Situação
          <select name="status">
            ${[
              "Atualizada",
              "Revisar",
              "Recuperar acesso",
              "Trocar senha",
              "Desativar"
            ].map(v =>
              `<option ${atual.status === v ? "selected" : ""}>${v}</option>`
            ).join("")}
          </select>
        </label>

        <label>
          Última troca de senha
          <input
            name="ultimaTroca"
            type="date"
            value="${esc(atual.ultimaTroca || "")}">
        </label>

        <label>
          Nome da entrada no Bitwarden
          <input
            name="referenciaCofre"
            autocomplete="off"
            placeholder="Ex.: Gmail profissional"
            value="${esc(atual.referenciaCofre || "")}">
        </label>

        <label class="form-span-2">
          Página oficial de acesso
          <input
            name="link"
            autocomplete="off"
            placeholder="https://..."
            value="${esc(atual.link || "")}">
        </label>

        <label class="form-span-2">
          Observação SEM SEGREDOS
          <textarea
            name="observacao"
            rows="4"
            placeholder="Ex.: telefone antigo; preciso revisar recuperação. Não colocar senha ou código.">${esc(atual.observacao || "")}</textarea>
        </label>

      </form>

      <button id="segSalvar"
              class="btn-primary btn-full"
              type="button">
        Salvar registro
      </button>
    `;

    document.getElementById("segModal").classList.remove("oculto");

    document.getElementById("segSalvar").onclick = () => {
      const form = document.getElementById("segForm");
      const dados = Object.fromEntries(new FormData(form));

      const estadoAtual = ler();

      const item = {
        id: dados.id || `conta-${Date.now()}`,
        servico: dados.servico.trim(),
        conta: dados.conta.trim(),
        acesso: dados.acesso,
        status: dados.status,
        ultimaTroca: dados.ultimaTroca,
        referenciaCofre: dados.referenciaCofre.trim(),
        link: validarLink(dados.link.trim()),
        observacao: dados.observacao.trim()
      };

      if (!item.servico) {
        alert("Informe o serviço.");
        return;
      }

      const pos = estadoAtual.contas.findIndex(x => x.id === item.id);

      if (pos >= 0) {
        estadoAtual.contas[pos] = item;
      } else {
        estadoAtual.contas.push(item);
      }

      salvar(estadoAtual);

      document.getElementById("segModal").classList.add("oculto");

      render();
    };
  }

  function marcarTrocaHoje(id) {
    const estado = ler();
    const item = estado.contas.find(x => x.id === id);
    if (!item) return;

    item.ultimaTroca = hoje();
    item.status = "Atualizada";

    salvar(estado);
    render();
  }

  function excluir(id) {
    if (!confirm("Excluir somente este registro de controle?")) return;

    const estado = ler();
    estado.contas = estado.contas.filter(x => x.id !== id);

    salvar(estado);
    render();
  }

  function exportar() {
    const conteudo = JSON.stringify(ler(), null, 2);

    const blob = new Blob(
      [conteudo],
      { type: "application/json;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `nexoterracore-contas-seguranca-${hoje()}.json`;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 3000);
  }

  function importarArquivo(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const dados = JSON.parse(reader.result);

        if (!dados || !Array.isArray(dados.contas)) {
          throw new Error("Formato inválido.");
        }

        if (!confirm(
          `Importar ${dados.contas.length} registros e substituir o cadastro atual?`
        )) return;

        const limpos = dados.contas.map(x => ({
          id: String(x.id || `conta-${Date.now()}-${Math.random()}`),
          servico: String(x.servico || ""),
          conta: String(x.conta || ""),
          acesso: String(x.acesso || "Não sei / revisar"),
          status: String(x.status || "Revisar"),
          ultimaTroca: String(x.ultimaTroca || ""),
          referenciaCofre: String(x.referenciaCofre || ""),
          link: validarLink(String(x.link || "")),
          observacao: String(x.observacao || "")
        }));

        salvar({ contas: limpos });
        render();

        alert("Cadastro restaurado com sucesso.");
      } catch (erro) {
        alert(`Não foi possível importar: ${erro.message}`);
      }
    };

    reader.readAsText(file);
  }

  function render() {
    const estado = ler();
    const lista = document.getElementById("segContasLista");

    if (!lista) return;

    const google = estado.contas.filter(
      x => x.acesso === "Entrar com Google"
    ).length;

    const revisar = estado.contas.filter(
      x => x.status !== "Atualizada"
    ).length;

    document.getElementById("segTotalContas").textContent =
      estado.contas.length;

    document.getElementById("segGoogle").textContent = google;
    document.getElementById("segRevisar").textContent = revisar;

    lista.innerHTML = estado.contas.length
      ? estado.contas.map(x => `
          <article class="operation-panel">
            <h3>${esc(x.servico)}</h3>

            <p>Conta</p>
            <strong>${esc(x.conta || "Não informada")}</strong>

            <p>Forma de acesso</p>
            <strong>${esc(x.acesso)}</strong>

            <p>Situação</p>
            <strong>${esc(x.status)}</strong>

            <p>Última troca</p>
            <strong>${esc(x.ultimaTroca || "Não registrada")}</strong>

            <p>Bitwarden</p>
            <strong>${esc(x.referenciaCofre || "Não registrado")}</strong>

            <div class="admin-actions">
              <button
                class="btn-secondary"
                data-seg-edit="${esc(x.id)}"
                type="button">
                Editar
              </button>

              <button
                class="btn-secondary"
                data-seg-troca="${esc(x.id)}"
                type="button">
                Marcar troca hoje
              </button>

              ${x.link ? `
                <button
                  class="btn-secondary"
                  data-seg-link="${esc(x.link)}"
                  type="button">
                  Abrir serviço
                </button>
              ` : ""}

              <button
                class="btn-secondary"
                data-seg-del="${esc(x.id)}"
                type="button">
                Excluir
              </button>
            </div>
          </article>
        `).join("")
      : `
        <div class="notice">
          Nenhuma conta cadastrada.
          Comece registrando apenas o serviço e a identificação da conta.
        </div>
      `;

    lista.querySelectorAll("[data-seg-edit]").forEach(btn => {
      btn.onclick = () => abrirEditor(btn.dataset.segEdit);
    });

    lista.querySelectorAll("[data-seg-troca]").forEach(btn => {
      btn.onclick = () => marcarTrocaHoje(btn.dataset.segTroca);
    });

    lista.querySelectorAll("[data-seg-del]").forEach(btn => {
      btn.onclick = () => excluir(btn.dataset.segDel);
    });

    lista.querySelectorAll("[data-seg-link]").forEach(btn => {
      btn.onclick = () => {
        const link = validarLink(btn.dataset.segLink);
        if (link) window.open(link, "_blank", "noopener,noreferrer");
      };
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btnNovaContaSeg")
      ?.addEventListener("click", () => abrirEditor());

    document.getElementById("btnExportarContasSeg")
      ?.addEventListener("click", exportar);

    document.getElementById("btnImportarContasSeg")
      ?.addEventListener("click", () => {
        const input = document.getElementById("segImportFile");
        input.value = "";
        input.click();
      });

    document.getElementById("segImportFile")
      ?.addEventListener("change", evento => {
        importarArquivo(evento.target.files?.[0]);
      });

    document.getElementById("btnAbrirBitwarden")
      ?.addEventListener("click", () => {
        window.open(
          "https://vault.bitwarden.com/",
          "_blank",
          "noopener,noreferrer"
        );
      });

    render();
  });
})();
