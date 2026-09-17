const TURNSTILE_SITE_KEY = "0x4AAAAAAE6Lq28pasbDlduE";

// Tema stagionale "foliage": si attiva da solo durante tutto il mese di ottobre,
// niente da configurare, sparisce automaticamente a novembre.
// Per testarlo in anticipo basta aggiungere ?theme=foliage all'URL.
(function applySeasonalFoliageTheme() {
  const isOctober = new Date().getMonth() === 9;
  const forced = new URLSearchParams(window.location.search).get("theme") === "foliage";
  if (!isOctober && !forced) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.documentElement.classList.add("theme-foliage");

  const LEAF_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c5 3 9 7 9 12a9 9 0 0 1-18 0c0-5 4-9 9-12z"/></svg>';

  const ACORN_SVG =
    '<svg viewBox="0 0 24 24">' +
    '<ellipse cx="12" cy="15" rx="6" ry="7" fill="#a9793c"/>' +
    '<path d="M5 10 Q12 6 19 10 L19 11.5 Q12 8.5 5 11.5 Z" fill="#6b4a24"/>' +
    '<rect x="11" y="2" width="2" height="4" rx="1" fill="#523a1c"/>' +
    '</svg>';

  const SAMARA_SVG =
    '<svg viewBox="0 0 24 40">' +
    '<ellipse cx="8" cy="32" rx="5" ry="6" fill="#8a6a2a"/>' +
    '<path d="M8 26 C6 14 10 4 16 2 C14 12 12 20 10 27 Z" fill="#c7a23a" opacity=".85"/>' +
    '</svg>';

  const BIRD_SVG =
    '<svg viewBox="0 0 40 16"><path d="M0 8 Q10 -4 20 8 Q30 -4 40 8" stroke="#3a2c22" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';

  const BRANCH_SVG =
    '<svg viewBox="0 0 130 130"><path d="M0 6 Q45 0 70 30 Q90 55 60 45 M40 15 Q55 25 50 45 M20 8 Q30 20 22 34" stroke="#6b4a24" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="70" cy="30" r="6" fill="#b5541f"/><circle cx="50" cy="45" r="5" fill="#c98a2c"/><circle cx="22" cy="34" r="4.5" fill="#a83f1e"/></svg>';

  const LEAF_COLORS = [
    "#c9622a", "#a83f1e", "#c98a2c", "#8a3d15", "#d9a13a",
    "#b5541f", "#7a6a1f", "#96631c", "#e0a24a", "#9c4a1a",
    "#e3b23a", "#d1451f", "#8f6b1e", "#c7742a", "#a5711f",
    "#e8c158", "#7d8a3a", "#b03a2a", "#6f5a17", "#f0a93a",
  ];

  const LEAF_COUNT = 24;
  const ACORN_COUNT = 6;
  const SAMARA_COUNT = 7;

  // ---------- Preferenza utente: se ha disattivato l'effetto in una
  // visita precedente, lo teniamo in pausa (badge resta comunque per
  // permettergli di riattivarlo). ----------
  const STORAGE_KEY = "foliageDisabled";
  let disabled = localStorage.getItem(STORAGE_KEY) === "1";
  if (disabled) document.documentElement.classList.add("foliage-paused");

  // ---------- Gestione del "vento" generato dal mouse: solo le foglie
  // normali reagiscono, con una spinta laterale che decresce da sola.
  // Il ciclo requestAnimationFrame si ferma automaticamente quando la
  // spinta è tornata a zero: nessun consumo continuo in background. ----------
  const windState = { mouseXvw: null, active: false };
  const leafRegistry = [];
  const WIND_RADIUS_VW = 9;
  const WIND_MAX_PUSH = 46;

  function windTick() {
    let anyActive = false;
    for (const item of leafRegistry) {
      let target = 0;
      if (windState.mouseXvw !== null) {
        const dist = item.leftVw - windState.mouseXvw;
        const absDist = Math.abs(dist);
        if (absDist < WIND_RADIUS_VW) {
          const strength = (WIND_RADIUS_VW - absDist) / WIND_RADIUS_VW;
          target = Math.sign(dist || 1) * strength * WIND_MAX_PUSH;
        }
      }
      item.wind += (target - item.wind) * 0.12;
      if (Math.abs(item.wind) > 0.4) anyActive = true;
      item.el.style.setProperty("--wind", item.wind.toFixed(1) + "px");
    }
    if (anyActive) {
      windState.rafId = requestAnimationFrame(windTick);
    } else {
      windState.rafId = null;
    }
  }

  function handleMouseMove(e) {
    windState.mouseXvw = (e.clientX / window.innerWidth) * 100;
    if (!windState.rafId) windState.rafId = requestAnimationFrame(windTick);
  }

  // ---------- Sfondo atmosferico: nebbiolina, vignettatura, raggi di
  // sole, rametti statici agli angoli. Quasi tutto statico o animato
  // solo in opacità: costo trascurabile anche a lungo termine. ----------
  function injectBackgroundFx() {
    const bg = document.createElement("div");
    bg.className = "foliage-bg-fx";

    const fog = document.createElement("div");
    fog.className = "foliage-fog";
    bg.appendChild(fog);

    const vignette = document.createElement("div");
    vignette.className = "foliage-vignette";
    bg.appendChild(vignette);

    const rays = document.createElement("div");
    rays.className = "foliage-rays";
    bg.appendChild(rays);

    const branchTL = document.createElement("div");
    branchTL.className = "foliage-branch top-left";
    branchTL.innerHTML = BRANCH_SVG;
    bg.appendChild(branchTL);

    const branchTR = document.createElement("div");
    branchTR.className = "foliage-branch top-right";
    branchTR.innerHTML = BRANCH_SVG;
    bg.appendChild(branchTR);

    document.body.prepend(bg);
  }

  // ---------- Foglie, ghiande, samare che cadono. ----------
  function injectFallingElements(layer) {
    for (let i = 0; i < LEAF_COUNT; i++) {
      const leaf = createFallingLeaf(i);
      layer.appendChild(leaf.el);
      leafRegistry.push(leaf);
    }
    for (let i = 0; i < ACORN_COUNT; i++) {
      layer.appendChild(createFallingAcorn(i));
    }
    for (let i = 0; i < SAMARA_COUNT; i++) {
      layer.appendChild(createFallingSamara(i));
    }
  }

  function createFallingLeaf(i) {
    const leaf = document.createElement("div");
    leaf.className = "leaf";

    const sway = document.createElement("div");
    sway.className = "leaf-sway";
    sway.innerHTML = LEAF_SVG;
    leaf.appendChild(sway);

    const size = 13 + Math.round(Math.random() * 15);
    const left = Math.random() * 100;
    const duration = 9 + Math.random() * 15;
    const delay = -Math.random() * 24;
    const drift = Math.round((Math.random() - 0.5) * 170) + "px";
    const rotStart = Math.round(Math.random() * 360);
    const rotEnd = rotStart + (Math.random() > 0.5 ? 1 : -1) * (260 + Math.random() * 280);
    const color = LEAF_COLORS[i % LEAF_COLORS.length];
    const swayDuration = 2 + Math.random() * 2;
    const flip = Math.random() > 0.5 ? -1 : 1;

    leaf.style.left = left + "vw";
    leaf.style.setProperty("--leaf-size", size + "px");
    leaf.style.color = color;
    leaf.style.setProperty("--drift", drift);
    leaf.style.setProperty("--wind", "0px");
    leaf.style.setProperty("--rot-start", rotStart + "deg");
    leaf.style.setProperty("--rot-end", rotEnd + "deg");
    leaf.style.setProperty("--flip", flip);
    leaf.style.animationDuration = duration + "s";
    leaf.style.animationDelay = delay + "s";
    sway.style.animationDuration = swayDuration + "s";
    sway.style.animationDelay = (delay * 0.4) + "s";

    return { el: leaf, leftVw: left, wind: 0 };
  }

  function createFallingAcorn(i) {
    const nut = document.createElement("div");
    nut.className = "acorn";
    nut.innerHTML = ACORN_SVG;

    const size = 12 + Math.round(Math.random() * 8);
    const left = Math.random() * 100;
    const duration = 6 + Math.random() * 7;
    const delay = -Math.random() * 22;
    const drift = Math.round((Math.random() - 0.5) * 60) + "px";
    const rotStart = Math.round(Math.random() * 360);
    const rotEnd = rotStart + (Math.random() > 0.5 ? 1 : -1) * (500 + Math.random() * 300);

    nut.style.left = left + "vw";
    nut.style.setProperty("--nut-size", size + "px");
    nut.style.setProperty("--drift", drift);
    nut.style.setProperty("--rot-start", rotStart + "deg");
    nut.style.setProperty("--rot-end", rotEnd + "deg");
    nut.style.animationDuration = duration + "s";
    nut.style.animationDelay = delay + "s";

    return nut;
  }

  function createFallingSamara(i) {
    const sam = document.createElement("div");
    sam.className = "samara";
    sam.innerHTML = SAMARA_SVG;

    const scale = 0.85 + Math.random() * 0.5;
    const left = Math.random() * 100;
    const duration = 14 + Math.random() * 12;
    const delay = -Math.random() * 26;
    const drift = Math.round((Math.random() - 0.5) * 260) + "px";
    const spins = Math.round((6 + Math.random() * 6)) * 360 * (Math.random() > 0.5 ? 1 : -1);

    sam.style.left = left + "vw";
    sam.style.setProperty("--sam-w", Math.round(10 * scale) + "px");
    sam.style.setProperty("--sam-h", Math.round(26 * scale) + "px");
    sam.style.setProperty("--drift", drift);
    sam.style.setProperty("--spins", spins + "deg");
    sam.style.animationDuration = duration + "s";
    sam.style.animationDelay = delay + "s";

    return sam;
  }

  // ---------- Uccelli migratori: comparsa rara e non ciclica, un
  // passaggio ogni 2-4 minuti, si rimuovono da soli a fine volo. ----------
  function scheduleBird(layer) {
    const nextIn = 110000 + Math.random() * 130000; // 110-240s
    setTimeout(() => {
      if (!document.documentElement.classList.contains("foliage-paused")) {
        spawnBird(layer);
      }
      scheduleBird(layer);
    }, nextIn);
  }

  function spawnBird(layer) {
    const bird = document.createElement("div");
    bird.className = "bird";
    const wing = document.createElement("div");
    wing.className = "bird-wing";
    wing.innerHTML = BIRD_SVG;
    bird.appendChild(wing);

    const duration = 18 + Math.random() * 10;
    const drift = Math.round(4 + Math.random() * 10) + "vh";
    const flapDuration = 0.5 + Math.random() * 0.3;

    bird.style.top = (4 + Math.random() * 10) + "vh";
    bird.style.setProperty("--bird-drift", drift);
    bird.style.animationDuration = duration + "s";
    wing.style.animationDuration = flapDuration + "s";

    bird.addEventListener("animationend", () => bird.remove());
    layer.appendChild(bird);
  }

  // ---------- Badge/toggle in topbar per disattivare tutto l'effetto. ----------
  function injectToggle() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "foliage-toggle";
    btn.textContent = disabled ? "🍂 Tema autunno: off" : "🍂 Tema autunno: on";

    btn.addEventListener("click", () => {
      disabled = !disabled;
      localStorage.setItem(STORAGE_KEY, disabled ? "1" : "0");
      document.documentElement.classList.toggle("foliage-paused", disabled);
      btn.textContent = disabled ? "🍂 Tema autunno: off" : "🍂 Tema autunno: on";
    });

    const topbarNav = document.querySelector(".topbar nav");
    if (topbarNav) {
      topbarNav.appendChild(btn);
    } else {
      btn.classList.add("foliage-toggle-fallback");
      document.body.appendChild(btn);
    }
  }

  function injectLeaves() {
    if (document.querySelector(".leaves-layer")) return;

    injectBackgroundFx();

    const layer = document.createElement("div");
    layer.className = "leaves-layer";
    document.body.prepend(layer);

    injectFallingElements(layer);
    scheduleBird(layer);
    injectToggle();

    if (!prefersReducedMotion) {
      document.addEventListener("mousemove", handleMouseMove, { passive: true });
    }
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
