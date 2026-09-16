let currentMonth = new Date();
currentMonth.setDate(1);

const tabs = document.getElementById("tabs");
const calendarView = document.getElementById("calendar-view");
const upcomingView = document.getElementById("upcoming-view");

tabs.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-view]");
  if (!btn) return;
  tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
  if (btn.dataset.view === "calendar") {
    calendarView.style.display = "";
    upcomingView.style.display = "none";
  } else {
    calendarView.style.display = "none";
    upcomingView.style.display = "";
    loadUpcoming();
  }
});

document.getElementById("prev-month").addEventListener("click", () => {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  loadCalendar();
});
document.getElementById("next-month").addEventListener("click", () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  loadCalendar();
});
document.getElementById("today-btn").addEventListener("click", () => {
  currentMonth = new Date();
  currentMonth.setDate(1);
  loadCalendar();
});

async function loadCalendar() {
  document.getElementById("month-label").textContent = currentMonth.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  const firstOfMonth = new Date(currentMonth);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // lunedi = 0
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - startWeekday);

  const lastOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const endWeekday = (lastOfMonth.getDay() + 6) % 7;
  const gridEnd = new Date(lastOfMonth);
  gridEnd.setDate(gridEnd.getDate() + (6 - endWeekday));

  let events = [];
  try {
    events = await apiGet(`/api/events?from=${isoDate(gridStart)}&to=${isoDate(gridEnd)}`);
  } catch (e) {
    showToast("Non e' stato possibile caricare gli eventi");
  }

  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";
  GIORNI_SETTIMANA.forEach((g) => {
    const el = document.createElement("div");
    el.className = "calendar-weekday";
    el.textContent = g;
    grid.appendChild(el);
  });

  const today = isoDate(new Date());
  const d = new Date(gridStart);
  while (d <= gridEnd) {
    const iso = isoDate(d);
    const dayEvents = events.filter((e) => iso >= e.start_date && iso <= e.end_date);

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className =
      "calendar-day" +
      (d.getMonth() !== currentMonth.getMonth() ? " outside" : "") +
      (iso === today ? " today" : "");
    cell.innerHTML = `<span class="day-number">${d.getDate()}</span><span class="day-dots">${dayEvents
      .slice(0, 4)
      .map(() => `<span class="day-dot"></span>`)
      .join("")}</span>`;

    if (dayEvents.length) {
      cell.addEventListener("click", () => showDayEvents(iso, dayEvents));
    } else {
      cell.style.cursor = "default";
    }
    grid.appendChild(cell);
    d.setDate(d.getDate() + 1);
  }
}

function showDayEvents(iso, dayEvents) {
  if (dayEvents.length === 1) {
    openEventModal(dayEvents[0].slug);
    return;
  }
  const root = document.getElementById("modal-root");
  root.innerHTML = "";
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-wrap">
      <button type="button" class="modal-close" data-close aria-label="Chiudi">&times;</button>
      <div class="modal-content">
        <h2>${parseIsoDate(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}</h2>
        <div class="event-list">
          ${dayEvents
            .map(
              (e) => `
            <div class="event-card" data-slug="${e.slug}" style="cursor: pointer; display: flex; align-items: center; gap: 1rem;">
              ${e.image_url ? `<img src="${e.image_url}" alt="" class="list-thumb" style="width:60px; height:60px; object-fit:cover; border-radius:8px; cursor:zoom-in;">` : ""}
              <div class="event-card-body" style="flex:1;"><h3>${escapeHtml(e.title)}</h3></div>
            </div>`
            )
            .join("")}
        </div>
      </div>
    </div>`;
  backdrop.appendChild(modal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) root.innerHTML = ""; });
  modal.querySelector("[data-close]").addEventListener("click", () => (root.innerHTML = ""));
  
  modal.querySelectorAll(".event-card").forEach((el) => {
    const slug = el.dataset.slug;
    const thumb = el.querySelector(".list-thumb");
    
    if (thumb) {
      thumb.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openImageFullscreen(thumb.src);
      });
    }
    el.addEventListener("click", () => openEventModal(slug));
  });

  root.appendChild(backdrop);
}

async function loadUpcoming() {
  const list = document.getElementById("upcoming-list");
  list.innerHTML = `<p class="empty-state">Caricamento...</p>`;
  const today = isoDate(new Date());
  const future = new Date();
  future.setDate(future.getDate() + 365);

  let events = [];
  try {
    events = await apiGet(`/api/events?from=${today}&to=${isoDate(future)}`);
  } catch (e) {
    list.innerHTML = `<p class="empty-state">Non e' stato possibile caricare gli eventi.</p>`;
    return;
  }

  if (!events.length) {
    list.innerHTML = `<p class="empty-state">Nessun evento in programma.</p>`;
    return;
  }

  list.innerHTML = "";
  events.forEach((e) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "event-card";
    card.innerHTML = `
      ${e.image_url ? `<img src="${e.image_url}" alt="" class="upcoming-thumb">` : ""}
      <div class="event-card-body">
        <div class="event-date">${formatDateRange(e.start_date, e.end_date)}</div>
        <h3>${escapeHtml(e.title)}</h3>
        ${e.description ? `<p>${escapeHtml(e.description)}</p>` : ""}
      </div>`;
    
    const thumb = card.querySelector(".upcoming-thumb");
    if (thumb) {
      thumb.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openImageFullscreen(thumb.src);
      });
    }

    card.addEventListener("click", () => openEventModal(e.slug));
    list.appendChild(card);
  });
}

loadCalendar();
