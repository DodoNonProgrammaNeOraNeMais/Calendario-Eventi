document.addEventListener('DOMContentLoaded', () => {
  initAdmin();
});

function initAdmin() {
  loadAdminEvents();
  loadPendingVotes();
}

async function loadAdminEvents() {
  const container = document.getElementById('admin-events-list');
  if (!container) return;

  try {
    const res = await fetch('/api/admin/events');
    if (!res.ok) return;
    const events = await res.json();
    
    if (!events || events.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessun evento presente.</p>';
      return;
    }

    container.innerHTML = events.map(e => `
      <div class="admin-event-row">
        ${e.image_url ? `<img src="${e.image_url}" alt="Cover">` : '<div style="width:48px;height:48px;background:var(--pine-soft);border-radius:var(--radius-sm)"></div>'}
        <div class="info">
          <div class="title">${escapeHtml(e.title)}</div>
          <div class="dates">${formatDate(e.start_date)} - ${formatDate(e.end_date)}</div>
        </div>
        <div class="row-actions">
          <button type="button" class="danger" onclick="deleteEvent('${e.id}')">Elimina</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function loadPendingVotes() {
  const container = document.getElementById('pending-votes-list');
  if (!container) return;

  try {
    const res = await fetch('/api/admin/votes');
    if (!res.ok) return;
    const votes = await res.json();
    const pendingVotes = (votes || []).filter(v => v.status === 'pending');

    if (pendingVotes.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessuna richiesta in sospeso.</p>';
      return;
    }

    container.innerHTML = pendingVotes.map(v => `
      <div class="admin-event-row" id="vote-row-${v.id}">
        <div class="info">
          <div class="title">${escapeHtml(v.voter_name || v.user_name || 'Utente')}</div>
          <div class="dates">Sondaggio / Richiesta in attesa</div>
        </div>
        <div class="row-actions">
          <button type="button" onclick="acceptVote('${v.id}')">Accetta</button>
          <button type="button" class="danger" onclick="rejectVote('${v.id}')">Rifiuta</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

window.acceptVote = async function(voteId) {
  const res = await fetch(`/api/admin/votes/${voteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'accept' })
  });
  if (res.ok) {
    loadPendingVotes();
    loadAdminEvents();
  }
};

window.rejectVote = async function(voteId) {
  const res = await fetch(`/api/admin/votes/${voteId}`, { method: 'DELETE' });
  if (res.ok) {
    loadPendingVotes();
  }
};

window.deleteEvent = async function(eventId) {
  if (!confirm('Eliminare l\'evento?')) return;
  const res = await fetch(`/api/admin/events/${eventId}`, { method: 'DELETE' });
  if (res.ok) loadAdminEvents();
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
