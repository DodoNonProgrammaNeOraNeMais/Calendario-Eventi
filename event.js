document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("app");
  const slug = root.dataset.slug;

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
