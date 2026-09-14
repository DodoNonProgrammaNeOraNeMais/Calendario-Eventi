let uploadedImageKey = null;
let editingId = null;

const form = document.getElementById("event-form");
const banner = document.getElementById("banner");

document.getElementById("image-drop").addEventListener("click", () => document.getElementById("image-input").click());

document.getElementById("image-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const drop = document.getElementById("image-drop");
  const previousText = drop.textContent;
  drop.textContent = "Caricamento in corso...";

  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    uploadedImageKey = data.key;
    const preview = document.getElementById("image-preview");
    preview.src = data.url;
    preview.style.display = "block";
    drop.textContent = "Cambia immagine";
  } catch (err) {
    showToast("Caricamento immagine non riuscito");
    drop.textContent = previousText;
  }
});

document.getElementById("poll-toggle").addEventListener("change", (e) => {
  document.getElementById("poll-fields").style.display = e.target.checked ? "block" : "none";
});

function addOptionRow(value = "") {
  const container = document.getElementById("poll-options");
  const row = document.createElement("div");
  row.className = "option-row";
  row.innerHTML = `<input type="text" value="${escapeHtml(value)}" placeholder="Opzione"><button type="button" aria-label="Rimuovi opzione">&times;</button>`;
  row.querySelector("button").addEventListener("click", () => {
    if (container.children.length > 2) row.remove();
    else showToast("Servono almeno due opzioni");
  });
  container.appendChild(row);
}
document.getElementById("add-option").addEventListener("click", () => addOptionRow());

function resetOptions() {
  document.getElementById("poll-options").innerHTML = "";
  addOptionRow();
  addOptionRow();
}
resetOptions();

document.getElementById("cancel-edit").addEventListener("click", resetForm);

function resetForm() {
  editingId = null;
  uploadedImageKey = null;
  form.reset();
  document.getElementById("image-preview").style.display = "none";
  document.getElementById("image-drop").textContent = "Clicca per scegliere un'immagine (opzionale)";
  document.getElementById("poll-toggle").checked = false;
  document.getElementById("poll-fields").style.display = "none";
  resetOptions();
  document.getElementById("submit-btn").textContent = "Crea evento";
  document.getElementById("cancel-edit").style.display = "none";
  banner.innerHTML = "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const startDate = document.getElementById("start-date").value;
  const endDate = document.getElementById("end-date").value;
  const description = document.getElementById("description").value.trim();
  const participants = document
    .getElementById("participants")
    .value.split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!title || !startDate || !endDate) {
    showToast("Compila titolo e date");
    return;
  }
  if (endDate < startDate) {
    showToast("La data di fine non puo' essere prima dell'inizio");
    return;
  }

  let poll = null;
  const pollToggle = document.getElementById("poll-toggle");
  if (pollToggle && pollToggle.checked) {
    const questionEl = document.getElementById("poll-question");
    const deadlineEl = document.getElementById("poll-deadline");
    const question = questionEl ? questionEl.value.trim() : "";
    const deadlineValue = deadlineEl ? deadlineEl.value : "";
    const optionInputs = Array.from(document.querySelectorAll("#poll-options input"));
    const options = optionInputs.map((i) => i.value.trim()).filter(Boolean);

    if (!question || !deadlineValue || options.length < 2) {
      showToast("Completa domanda, scadenza e almeno due opzioni del sondaggio");
      return;
    }

    const deadlineDate = new Date(deadlineValue);
    if (isNaN(deadlineDate.getTime())) {
      showToast("La data di scadenza del sondaggio non e' valida");
      return;
    }

    poll = {
      question: question,
      deadline: deadlineDate.toISOString(),
      options: options,
    };
  }

  const payload = {
    title,
    description,
    start_date: startDate,
    end_date: endDate,
    image_key: uploadedImageKey,
    participants,
    poll,
  };

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;

  try {
    const url = editingId ? `/api/admin/events/${editingId}` : "/api/admin/events";
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    banner.innerHTML = `<div class="banner success">Evento salvato.</div>`;
    resetForm();
    loadAdminEvents();
  } catch (err) {
    banner.innerHTML = `<div class="banner error">Non e' stato possibile salvare l'evento. Riprova.</div>`;
  } finally {
    submitBtn.disabled = false;
  }
});

async function loadAdminEvents() {
  const list = document.getElementById("admin-event-list");
  list.innerHTML = "Caricamento...";

  let events = [];
  try {
    events = await apiGet("/api/events?from=2000-01-01&to=2100-01-01");
  } catch (e) {
    list.innerHTML = `<p class="empty-state">Non e' stato possibile caricare gli eventi.</p>`;
    return;
  }

  if (!events.length) {
    list.innerHTML = `<p class="empty-state">Ancora nessun evento creato.</p>`;
    return;
  }

  list.innerHTML = "";
  events.forEach((e) => {
    const row = document.createElement("div");
    row.className = "admin-event-row";
    row.innerHTML = `
      ${e.image_url ? `<img src="${e.image_url}" alt="">` : `<div style="width:46px;height:46px;border-radius:6px;background:#efece1;flex-shrink:0;"></div>`}
      <div class="info">
        <div class="title">${escapeHtml(e.title)}</div>
        <div class="dates">${formatDateRange(e.start_date, e.end_date)}</div>
      </div>
      <div class="row-actions">
        <button type="button" class="secondary" data-edit="${e.id}" data-slug="${e.slug}">Modifica</button>
        <button type="button" class="danger" data-delete="${e.id}">Elimina</button>
      </div>`;
    list.appendChild(row);
  });

  list.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => startEdit(btn.dataset.edit, btn.dataset.slug));
  });
  list.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => deleteEvent(btn.dataset.delete));
  });
}

async function startEdit(id, slug) {
  const event = await apiGet(`/api/events/${slug}`);
  editingId = id;
  uploadedImageKey = null; // se non viene caricata una nuova immagine, il server mantiene quella attuale

  document.getElementById("title").value = event.title;
  document.getElementById("start-date").value = event.start_date;
  document.getElementById("end-date").value = event.end_date;
  document.getElementById("description").value = event.description || "";
  document.getElementById("participants").value = (event.participants || []).join("\n");

  const preview = document.getElementById("image-preview");
  if (event.image_url) {
    preview.src = event.image_url;
    preview.style.display = "block";
    document.getElementById("image-drop").textContent = "Cambia immagine";
  } else {
    preview.style.display = "none";
    document.getElementById("image-drop").textContent = "Clicca per scegliere un'immagine (opzionale)";
  }

  document.getElementById("poll-options").innerHTML = "";
  if (event.poll) {
    document.getElementById("poll-toggle").checked = true;
    document.getElementById("poll-fields").style.display = "block";
    document.getElementById("poll-question").value = event.poll.question;
    document.getElementById("poll-deadline").value = toLocalDatetimeInputValue(event.poll.deadline);
    event.poll.options.forEach((o) => addOptionRow(o.label));
  } else {
    document.getElementById("poll-toggle").checked = false;
    document.getElementById("poll-fields").style.display = "none";
    addOptionRow();
    addOptionRow();
  }

  document.getElementById("submit-btn").textContent = "Salva modifiche";
  document.getElementById("cancel-edit").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toLocalDatetimeInputValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function deleteEvent(id) {
  if (!confirm("Eliminare questo evento? L'azione non si puo' annullare.")) return;
  try {
    const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    if (editingId === id) resetForm();
    loadAdminEvents();
  } catch (err) {
    showToast("Non e' stato possibile eliminare l'evento");
  }
}

loadAdminEvents();

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("app");
  if (!root) return;
  const slug = root.dataset.slug;
  if (!slug) return;

  const topbar = document.createElement("header");
  topbar.className = "topbar";
  topbar.innerHTML = `<a class="brand" href="/">Calendario eventi</a>`;
  document.body.prepend(topbar);

  const container = document.createElement("div");
  container.id = "event-container";
  root.appendChild(container);

  async function load() {
    try {
      const event = await apiGet(`/api/events/${slug}`);
      container.innerHTML = "";
      const card = document.createElement("div");
      card.className = "modal standalone-card";
      card.appendChild(renderEventDetail(event, load, { showClose: false }));
      container.appendChild(card);
    } catch (e) {
      container.innerHTML = `<p class="empty-state">Evento non trovato.</p>`;
    }
  }

  load();
});
