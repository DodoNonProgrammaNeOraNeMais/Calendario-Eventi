const TURNSTILE_SITE_KEY = "0x4AAAAAAE6Lq28pasbDlduE";

// Tema stagionale "foliage": si attiva da solo durante tutto il mese di ottobre,
// niente da configurare, sparisce automaticamente a novembre.
// Per testarlo in anticipo basta aggiungere ?theme=foliage all'URL.
(function applySeasonalFoliageTheme() {
  const isOctober = new Date().getMonth() === 9; // 0 = gennaio, quindi 9 = ottobre
  const forced = new URLSearchParams(window.location.search).get("theme") === "foliage";
  if (!isOctober && !forced) return;
  document.documentElement.classList.add("theme-foliage");

  const LEAF_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 22C7 21 2.5 16.8 3.2 11.2 3.8 6.4 8 2.3 13 2c4 3.5 6 8.6 4.3 13.4C15.9 19.3 12 22 12 22z"/><path fill="none" stroke="#2b1a0f" stroke-opacity="0.4" stroke-width="1.1" stroke-linecap="round" d="M12.5 21C11.8 16 12 9.5 13.2 3"/><path fill="none" stroke="#2b1a0f" stroke-opacity="0.28" stroke-width="0.7" stroke-linecap="round" d="M12.6 15L9 12.5M12.3 11L8.3 9M12.8 18.5L9.7 16.7"/><path fill="none" stroke="#2b1a0f" stroke-opacity="0.28" stroke-width="0.7" stroke-linecap="round" d="M12.9 15.3L16.3 12.5M12.6 11.2L16.2 8.7M13 18.7L15.7 16.5"/></svg>';

  const LEAF_COLORS = ["#c9622a", "#a83f1e", "#c98a2c", "#8a3d15", "#d9a13a", "#b5541f", "#7a6a1f", "#96631c", "#e0a24a", "#9c4a1a"];
  const LEAF_COUNT = 30;

  // Solo 3 cumuli, grandi e sparsi (non equidistanti), con ampi vuoti tra
  // loro: uno vicino al bordo sinistro, uno verso il centro-destra, uno
  // vicino al bordo destro.
  const PILE_SPOTS = [
    { center: 6,  spread: 8,  startLevel: 30 },
    { center: 52, spread: 9,  startLevel: 22 },
    { center: 90, spread: 8,  startLevel: 34 },
  ];
  const MAX_PILE_LEAVES = 320;

  function injectLeaves() {
    if (document.querySelector(".leaves-layer")) return;

    // TUTTO in un unico livello DOM: foglie che cadono, tappeto di base e
    // cumuli sono tutti figli diretti dello stesso contenitore .leaves-layer.
    const layer = document.createElement("div");
    layer.className = "leaves-layer";
    document.body.prepend(layer);

    // 1) Tappeto di base FITTO lungo tutta la larghezza, presente da subito.
    seedBaseCarpet(layer);

    // 2) I 3 cumuli grandi, già ben visibili al caricamento.
    PILE_SPOTS.forEach((spot) => {
      for (let n = 0; n < spot.startLevel; n++) {
        const gauss = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
        const jitteredLeft = spot.center + gauss * spot.spread;
        const color = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];
        const size = 13 + Math.round(Math.random() * 14);
        addPileLeaf(layer, jitteredLeft, size, color, spot, true);
      }
    });

    // 3) Le foglie che cadono dall'alto.
    for (let i = 0; i < LEAF_COUNT; i++) {
      const leaf = document.createElement("div");
      leaf.className = "leaf";
      leaf.innerHTML = LEAF_SVG;

      const size = 13 + Math.round(Math.random() * 15);
      const left = Math.random() * 100;
      const duration = 9 + Math.random() * 15;
      const delay = -Math.random() * 24;
      const drift = Math.round((Math.random() - 0.5) * 170);
      const rotStart = Math.round(Math.random() * 360);
      const rotEnd = rotStart + (Math.random() > 0.5 ? 1 : -1) * (260 + Math.random() * 280);
      const color = LEAF_COLORS[i % LEAF_COLORS.length];
      const swayDuration = 2 + Math.random() * 2;
      const flip = Math.random() > 0.5 ? -1 : 1;

      leaf.style.left = left + "vw";
      leaf.style.width = size + "px";
      leaf.style.height = size + "px";
      leaf.style.color = color;
      leaf.style.setProperty("--drift", drift + "px");
      leaf.style.setProperty("--rot-start", rotStart + "deg");
      leaf.style.setProperty("--rot-end", rotEnd + "deg");
      leaf.style.setProperty("--flip", flip);
      leaf.style.animationDuration = duration + "s, " + swayDuration + "s";
      leaf.style.animationDelay = delay + "s, " + (delay * 0.4) + "s";

      layer.appendChild(leaf);

      // Quando una foglia completa la caduta, va ad ALIMENTARE uno dei 3
      // cumuli esistenti (nessun cumulo nuovo: restano sempre e solo 3).
      leaf.addEventListener("animationiteration", () => {
        landLeaf(layer, left, size, color);
      });
    }
  }

  function seedBaseCarpet(layer) {
    // Tappeto FITTO: una foglia ogni ~0.9vw, quasi senza vuoti, cosi' il
    // fondo risulta subito ricoperto e non "rado".
    for (let x = 0; x <= 100; x += 0.9) {
      if (Math.random() < 0.08) continue;
      const left = x + (Math.random() - 0.5) * 0.7;
      const size = 11 + Math.round(Math.random() * 10);
      const color = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];
      const piled = document.createElement("div");
      piled.className = "leaf-pile leaf-pile--seed leaf-pile--base";
      piled.innerHTML = LEAF_SVG;
      piled.style.left = Math.max(0, Math.min(100, left)) + "vw";
      piled.style.bottom = Math.random() * 5 + "px";
      piled.style.width = size + "px";
      piled.style.height = size + "px";
      piled.style.color = color;
      piled.style.setProperty("--settle-rot", Math.round(Math.random() * 360) + "deg");
      piled.style.zIndex = "1";
      layer.appendChild(piled);
    }
  }

  function pickPileSpot(nearLeft) {
    // Assegna sempre la foglia al cumulo più vicino tra i 3 esistenti:
    // non nascono mai nuovi cumuli, restano sempre e solo 3.
    let closest = PILE_SPOTS[0];
    let minDist = Infinity;
    PILE_SPOTS.forEach((spot) => {
      const dist = Math.abs(spot.center - nearLeft);
      if (dist < minDist) { minDist = dist; closest = spot; }
    });
    return closest;
  }

  function landLeaf(layer, leftVw, size, color) {
    const spot = pickPileSpot(leftVw);
    const gauss = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const jitteredLeft = spot.center + gauss * spot.spread;
    addPileLeaf(layer, jitteredLeft, size, color, spot, false);
  }

  function addPileLeaf(layer, leftVw, size, color, spot, isSeed) {
    const realLeaves = layer.querySelectorAll(".leaf-pile:not(.leaf-pile--base)");
    if (realLeaves.length >= MAX_PILE_LEAVES) {
      realLeaves[0].remove();
    }

    const piled = document.createElement("div");
    piled.className = "leaf-pile";
    piled.innerHTML = LEAF_SVG;

    spot.count = (spot.count || 0) + 1;
    // Crescita in altezza marcata: i 3 cumuli devono risultare grandi ed
    // evidenti, non un accumulo timido di puntini.
    const heightBoost = Math.min(spot.count * 1.1, 78);
    const pileSize = Math.max(11, size * (0.85 + Math.random() * 0.35));
    const rot = Math.round(Math.random() * 360);
    const bottomJitter = heightBoost * (0.75 + Math.random() * 0.5);
    const clampedLeft = Math.max(0, Math.min(100, leftVw));

    piled.style.left = clampedLeft + "vw";
    piled.style.bottom = bottomJitter + "px";
    piled.style.width = pileSize + "px";
    piled.style.height = pileSize + "px";
    piled.style.color = color;
    piled.style.setProperty("--settle-rot", rot + "deg");
    piled.style.zIndex = String(Math.round(bottomJitter) + 2);
    if (isSeed) piled.classList.add("leaf-pile--seed");

    layer.appendChild(piled);
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
