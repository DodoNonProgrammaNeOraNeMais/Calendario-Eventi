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
    preview.src = data.url || `/api/images/${data.key}`;
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

const POLL_OPTIONS = ["Sì", "No", "Forse"]; // fisse, coerenti col backend

document.getElementById("cancel-edit").addEventListener("click", resetForm);

function resetForm() {
  editingId = null;
  uploadedImageKey = null;
  form.reset();
  document.getElementById("image-preview").style.display = "none";
  document.getElementById("image-drop").textContent = "Clicca per scegliere un'immagine (opzionale)";
  document.getElementById("poll-toggle").checked = false;
  document.getElementById("poll-fields").style.display = "none";
  document.getElementById("submit-btn").textContent = "Crea evento";
  document.getElementById("cancel-edit").style.display = "none";
  
  const votesContainer = document.getElementById("admin-votes-container");
  if (votesContainer) votesContainer.remove();
  
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

    if (!question || !deadlineValue) {
      showToast("Completa domanda e scadenza del sondaggio");
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
      options: POLL_OPTIONS,
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
    let imgSrc = e.image_url;
    if (!imgSrc && e.image_key) {
      imgSrc = e.image_key.startsWith("http") ? e.image_key : `/api/images/${e.image_key}`;
    }

    const row = document.createElement("div");
    row.className = "admin-event-row";
    row.innerHTML = `
      ${imgSrc ? `<img src="${imgSrc}" alt="" style="width:46px;height:46px;border-radius:6px;object-fit:cover;flex-shrink:0;">` : `<div style="width:46px;height:46px;border-radius:6px;background:#efece1;flex-shrink:0;"></div>`}
      <div class="info">
        <div class="title">${escapeHtml(e.title)}</div>
        <div class="dates">${formatDateRange(e.start_date, e.end_date)}</div>
      </div>
      <div class="row-actions">
        <a href="/evento/${e.slug}" target="_blank" style="text-decoration: none;">
          <button type="button" class="secondary">Vedi Evento</button>
        </a>
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
  // Chiamata alle API admin per avere l'evento completo di voti e partecipanti
  let event = null;
  try {
    event = await apiGet(`/api/admin/events/${id}`);
  } catch (e) {
    event = await apiGet(`/api/events/${slug}`);
  }

  editingId = id;
  uploadedImageKey = null;

  document.getElementById("title").value = event.title;
  document.getElementById("start-date").value = event.start_date;
  document.getElementById("end-date").value = event.end_date;
  document.getElementById("description").value = event.description || "";
  document.getElementById("participants").value = (event.participants || []).join("\n");

  const preview = document.getElementById("image-preview");
  let imgSrc = event.image_url;
  if (!imgSrc && event.image_key) {
    imgSrc = event.image_key.startsWith("http") ? event.image_key : `/api/images/${event.image_key}`;
  }

  if (imgSrc) {
    preview.src = imgSrc;
    preview.style.display = "block";
    document.getElementById("image-drop").textContent = "Cambia immagine";
  } else {
    preview.style.display = "none";
    document.getElementById("image-drop").textContent = "Clicca per scegliere un'immagine (opzionale)";
  }

  let votesContainer = document.getElementById("admin-votes-container");
  if (!votesContainer) {
    votesContainer = document.createElement("div");
    votesContainer.id = "admin-votes-container";
    votesContainer.style.marginTop = "20px";
    document.getElementById("poll-fields").appendChild(votesContainer);
  }
  votesContainer.innerHTML = "";

  if (event.poll) {
    document.getElementById("poll-toggle").checked = true;
    document.getElementById("poll-fields").style.display = "block";
    document.getElementById("poll-question").value = event.poll.question;
    document.getElementById("poll-deadline").value = toLocalDatetimeInputValue(event.poll.deadline);
    event.poll.options.forEach((o) => addOptionRow(o.label));

    if (event.poll.detailedVotes && event.poll.detailedVotes.length > 0) {
      votesContainer.innerHTML = `<h4 style="margin-bottom:10px; border-bottom:1px solid #ccc; padding-bottom:5px;">Voti Ricevuti (Gestione)</h4>`;
      event.poll.detailedVotes.forEach(v => {
        const row = document.createElement("div");
        row.style.marginBottom = "8px";
        row.innerHTML = `<b>${escapeHtml(v.voter_name)}</b> ha votato: <i>${escapeHtml(v.option_label)}</i> 
                         <button type="button" class="danger" style="padding:2px 6px; margin-left:10px; font-size:12px;" onclick="deleteVote(${v.vote_id}, '${slug}')">Rifiuta</button>`;
        votesContainer.appendChild(row);
      });
    }
  } else {
    document.getElementById("poll-toggle").checked = false;
    document.getElementById("poll-fields").style.display = "none";
  }

  document.getElementById("submit-btn").textContent = "Salva modifiche";
  document.getElementById("cancel-edit").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toLocalDatetimeInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
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

window.deleteVote = async function(voteId, slug) {
  if (!confirm("Vuoi rifiutare e annullare questo voto?")) return;
  try {
    const res = await fetch(`/api/admin/votes/${voteId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error("Errore");
    showToast("Voto rimosso con successo");
    startEdit(editingId, slug); 
  } catch(e) {
    showToast("Errore durante l'eliminazione");
  }
}

loadAdminEvents();
