const TURNSTILE_SITE_KEY = "0x4AAAAAAE6Lq28pasbDlduE";

// Tema stagionale "foliage": si attiva da solo durante tutto il mese di ottobre,
// niente da configurare, sparisce automaticamente a novembre.
// Per testarlo in anticipo basta aggiungere ?theme=foliage all'URL.
(function applySeasonalFoliageTheme() {
  const isOctober = new Date().getMonth() === 9; // 0 = gennaio, quindi 9 = ottobre
  const forced = new URLSearchParams(window.location.search).get("theme") === "foliage";
  if (!isOctober && !forced) return;

  document.documentElement.classList.add("theme-foliage");

  const LEAF_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M28.082 9.534c-0.058 0.174-0.117 0.349-0.176 0.525 0.674 3.296 0.425 6.877-1.276 10.787 0.247-2.511 0.206-4.913-0.182-7.215-0.458 0.891-1.042 1.755-1.64 2.624 0.085 2.497-0.381 5.132-1.603 7.944 0.196-1.997 0.16-3.922-0.036-5.794-0.801 0.911-1.695 1.786-2.697 2.587-0.237 1.584-0.684 3.223-1.421 4.92 0.132-1.348 0.154-2.68 0.109-3.972-2.221 1.51-4.858 2.718-8.053 3.389 2.691-1.51 4.838-3.068 6.596-4.665-1.156-0.241-2.346-0.399-3.535-0.51 1.572-0.397 3.124-0.552 4.628-0.51 1.075-1.099 1.973-2.205 2.697-3.353-2.005-0.361-4.034-0.465-6.086-0.328 2.355-1.14 4.702-1.538 7.033-1.385 0.602-1.24 1.014-2.523 1.312-3.826-1.773-0.168-3.704 0.253-5.904 0.802 1.986-1.82 4.133-2.61 6.268-2.842 0.111-0.903 0.169-1.808 0.18-2.741-9.848-7.007-7.239 16.56-22.665 20.346 12.693 7.863 37.271-3.539 26.451-16.782zM25.788 1.846c0.628-0.305 1.39-0.323 1.968 0.219 0.33 3.103-0.68 9.663-4.665 14.249 3.039-5.538 3.261-9.548 2.697-14.467v-0z"></path>
</svg>

  function injectLeaves() {
    if (document.querySelector(".leaves-layer")) return;
    const layer = document.createElement("div");
    layer.className = "leaves-layer";
    for (let i = 0; i < 10; i++) {
      const leaf = document.createElement("div");
      leaf.className = "leaf";
      leaf.innerHTML = LEAF_SVG;
      layer.appendChild(leaf);
    }
    document.body.prepend(layer);
  }

  if (document.body) injectLeaves();
  else document.addEventListener("DOMContentLoaded", injectLeaves);
})();

const MESI_IT = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
const GIORNI_SETTIMANA = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];

function isoDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseIsoDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateRange(startIso, endIso) {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  const optsFull = { day: "numeric", month: "long", year: "numeric" };
  const optsShort = { day: "numeric", month: "long" };

  if (startIso === endIso) {
    return start.toLocaleDateString("it-IT", optsFull);
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString("it-IT", optsShort)} - ${end.toLocaleDateString("it-IT", optsFull)}`;
  }
  return `${start.toLocaleDateString("it-IT", optsFull)} - ${end.toLocaleDateString("it-IT", optsFull)}`;
}

function formatDeadline(iso) {
  return new Date(iso).toLocaleString("it-IT", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function eventShareUrl(slug) {
  return `${location.origin}/evento/${slug}`;
}

async function shareEvent(event) {
  const url = eventShareUrl(event.slug);
  if (navigator.share) {
    try {
      await navigator.share({ title: event.title, text: event.title, url });
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    showToast("Link copiato negli appunti");
  } catch (e) {
    window.prompt("Copia questo link:", url);
  }
}

function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function openImageFullscreen(url) {
  if (!url) return;
  const existing = document.querySelector(".image-fullscreen-backdrop");
  if (existing) existing.remove();

  const backdrop = document.createElement("div");
  backdrop.className = "image-fullscreen-backdrop";
  backdrop.innerHTML = `<img src="${url}" alt="Immagine a schermo intero">`;
  
  backdrop.addEventListener("click", () => {
    backdrop.remove();
  });
  
  document.body.appendChild(backdrop);
}

function renderEventDetail(event, onVoteChange, { showClose = true } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "modal-wrap";

  const closeBtn = showClose ? `<button type="button" class="modal-close" data-close aria-label="Chiudi">&times;</button>` : "";
  const image = event.image_url ? `<img class="cover" src="${event.image_url}" alt="">` : "";

  let participantsHtml = "";
  if (event.participants && event.participants.length) {
    participantsHtml = `
      <h3>Partecipanti</h3>
      <ul class="participants-list">${event.participants.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
    `;
  }

  let pollHtml = "";
  if (event.poll) {
    const totalVotes = event.poll.options.reduce((s, o) => s + o.votes, 0) || 1;
    const optionsHtml = event.poll.options
      .map((o) => {
        const pct = Math.round((o.votes / totalVotes) * 100);
        const selected = event.poll.myOptionId === o.id;
        const votersListHtml = o.voters ? `<div class="poll-voters-list" style="font-size: 0.85rem; color: #666; margin-top: 4px;">Hanno votato: ${escapeHtml(o.voters)}</div>` : "";

        return `
        <div class="poll-option ${selected ? "selected" : ""}" style="margin-bottom: 1rem;">
          <div class="bar-wrap">
            <div class="bar-label"><span>${escapeHtml(o.label)}${selected ? " (il tuo voto)" : ""}</span><span>${o.votes}</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          </div>
          ${votersListHtml}
          ${event.poll.isOpen ? `<button type="button" data-vote-option="${o.id}" class="${selected ? "secondary" : ""}" style="margin-top: 8px;">${selected ? "Cambia" : "Vota"}</button>` : ""}
        </div>`;
      })
      .join("");

    pollHtml = `
      <div class="poll-box">
        <h3>${escapeHtml(event.poll.question)}</h3>
        ${
          event.poll.isOpen && !event.poll.myOptionId
            ? `<div style="margin-bottom: 1rem;">
                  <label for="voter-name-input" style="display:block; margin-bottom:0.25rem; font-weight:600;">Nome e cognome, per votare:</label>
                 <input type="text" id="voter-name-input" placeholder="Es. Mario Rossi" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
               </div>
               <div class="turnstile-container" style="margin-bottom: 1rem;"></div>`
            : ""
        }
        ${optionsHtml}
        ${
          event.poll.isOpen
            ? `<div class="poll-deadline" style="margin-top: 1rem;">Puoi votare fino al ${formatDeadline(event.poll.deadline)}</div>
               ${event.poll.myOptionId ? `<button type="button" data-remove-vote class="secondary" style="margin-top:0.6rem;">Ritira il voto</button>` : ""}`
            : `<div class="poll-closed-note">Sondaggio chiuso</div>`
        }
      </div>`;
  }

  wrap.innerHTML = `
    ${closeBtn}
    ${image}
    <div class="modal-content">
      <div class="event-dates">${formatDateRange(event.start_date, event.end_date)}</div>
      <h2>${escapeHtml(event.title)}</h2>
      ${event.description ? `<p>${escapeHtml(event.description).replace(/\n/g, "<br>")}</p>` : ""}
      ${participantsHtml}
      ${pollHtml}
      <div class="actions-row">
        <button type="button" data-share class="secondary">Condividi</button>
      </div>
    </div>
  `;

  let turnstileWidgetId = null;
  const turnstileContainer = wrap.querySelector(".turnstile-container");
  if (turnstileContainer && window.turnstile) {
    setTimeout(() => {
      try {
        turnstile.ready(() => {
          try {
            turnstileWidgetId = turnstile.render(turnstileContainer, {
              sitekey: TURNSTILE_SITE_KEY,
              theme: "light",
            });
          } catch (e) {
            console.error("Turnstile render error:", e);
          }
        });
      } catch (e) {
        console.error("Turnstile ready error:", e);
      }
    }, 0);
  }

  const coverImg = wrap.querySelector("img.cover");
  if (coverImg) {
    coverImg.addEventListener("click", (e) => {
      e.stopPropagation();
      openImageFullscreen(coverImg.src);
    });
  }

  wrap.querySelector("[data-share]").addEventListener("click", () => shareEvent(event));

  wrap.querySelectorAll("[data-vote-option]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      let voterName = null;
      if (!event.poll.myOptionId) {
        const nameInput = wrap.querySelector("#voter-name-input");
        voterName = nameInput ? nameInput.value.trim() : "";
        if (!voterName) {
          showToast("Inserisci nome e cognome per votare!");
          if (nameInput) nameInput.focus();
          return;
        }
        if (!/\S+\s+\S+/.test(voterName)) {
          showToast("Inserisci sia il nome che il cognome (es. Mario Rossi)");
          if (nameInput) nameInput.focus();
          return;
        }
      } else {
        voterName = null; 
      }

      let turnstileToken = null;
      if (!event.poll.myOptionId) {
        turnstileToken = turnstileWidgetId !== null ? turnstile.getResponse(turnstileWidgetId) : null;
        if (!turnstileToken) {
          showToast("Completa la verifica anti-spam prima di votare");
          return;
        }
      }

      btn.disabled = true;
      try {
        const res = await fetch("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            pollId: event.poll.id, 
            optionId: Number(btn.dataset.voteOption),
            voterName: voterName,
            turnstileToken: turnstileToken,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        onVoteChange && onVoteChange();
      } catch (e) {
        showToast("Non e' stato possibile registrare il voto");
        btn.disabled = false;
      } finally {
        if (turnstileWidgetId !== null && window.turnstile) {
          try {
            turnstile.reset(turnstileWidgetId);
          } catch (resetErr) {
            console.error("Errore reset Turnstile:", resetErr);
          }
        }
      }
    });
  });

  const removeBtn = wrap.querySelector("[data-remove-vote]");
  if (removeBtn) {
    removeBtn.addEventListener("click", async () => {
      removeBtn.disabled = true;
      try {
        const res = await fetch(`/api/votes?pollId=${event.poll.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(await res.text());
        onVoteChange && onVoteChange();
      } catch (e) {
        showToast("Non e' stato possibile ritirare il voto");
        removeBtn.disabled = false;
      }
    });
  }

  return wrap;
}

function openEventModal(slug) {
  const root = document.getElementById("modal-root");

  async function load() {
    const event = await apiGet(`/api/events/${slug}`);
    root.innerHTML = "";
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.appendChild(renderEventDetail(event, load));
    backdrop.appendChild(modal);
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
    modal.querySelector("[data-close]").addEventListener("click", closeModal);
    root.appendChild(backdrop);
  }

  function closeModal() {
    root.innerHTML = "";
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape") closeModal(); }
  document.addEventListener("keydown", onKey);

  load().catch(() => showToast("Evento non trovato"));
}
