// ============================================================
// ADMIN.JS - GESTIONE EVENTI E APPROVAZIONE SONDAGGI/PARTECIPANTI
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initAdmin();
});

function initAdmin() {
  loadAdminEvents();
  loadPendingVotes(); // Carica le risposte in attesa di approvazione
  setupFormListeners();
}

// ------------------------------------------------------------
// 1. GESTIONE RISPOSTE SONDAGGIO (ACCETTA / RIFIUTA)
// ------------------------------------------------------------

async function loadPendingVotes() {
  const container = document.getElementById('pending-votes-list');
  if (!container) return;

  try {
    const res = await fetch('/api/admin/votes');
    if (!res.ok) throw new Error('Errore nel recupero delle risposte');
    
    const votes = await res.json();
    const pendingVotes = votes.filter(v => v.status === 'pending');

    if (pendingVotes.length === 0) {
      container.innerHTML = '<p class="empty-state">Nessuna risposta in attesa di approvazione.</p>';
      return;
    }

    container.innerHTML = pendingVotes.map(v => `
      <div class="admin-event-row" id="vote-row-${v.id}">
        <div class="info">
          <div class="title">${escapeHtml(v.voter_name || v.user_name)}</div>
          <div class="dates">Evento: ${escapeHtml(v.event_title || 'Sondaggio')} | Opzione: ${escapeHtml(v.option_text || 'Scelta #' + (v.option_id || v.option_index))}</div>
        </div>
        <div class="row-actions">
          <button type="button" onclick="acceptVote('${v.id}')">Accetta</button>
          <button type="button" class="danger" onclick="rejectVote('${v.id}')">Rifiuta</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Errore caricamento voti:', err);
  }
}

// Accetta la risposta e inserisce l'utente nei partecipanti
window.acceptVote = async function(voteId) {
  try {
    const res = await fetch(`/api/admin/votes/${voteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' })
    });

    if (res.ok) {
      const row = document.getElementById(`vote-row-${voteId}`);
      if (row) row.remove();
      showToast('Risposta accettata e partecipante aggiunto!');
      loadAdminEvents(); // Ricarica la lista eventi aggiornata
    } else {
      const errData = await res.json();
      alert('Errore: ' + (errData.error || 'Impossibile accettare'));
    }
  } catch (err) {
    console.error('Errore accettazione voto:', err);
    alert('Errore di connessione durante l\'operazione');
  }
};

// Rifiuta e cancella la richiesta dal database
window.rejectVote = async function(voteId) {
  if (!confirm('Sei sicuro di voler rifiutare e cancellare questa risposta?')) return;

  try {
    const res = await fetch(`/api/admin/votes/${voteId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      const row = document.getElementById(`vote-row-${voteId}`);
      if (row) row.remove();
      showToast('Richiesta eliminata');
    } else {
      alert('Errore durante l\'eliminazione della risposta');
    }
  } catch (err) {
    console.error('Errore rifiuto voto:', err);
  }
};

// ------------------------------------------------------------
// 2. GESTIONE LISTA ED ELIMINAZIONE EVENTI
// ------------------------------------------------------------

async function loadAdminEvents() {
  const container = document.getElementById('admin-events-list');
  if (!container) return;

  try {
    const res = await fetch('/api/admin/events');
    if (!res.ok) throw new Error('Errore nel caricamento eventi');
    
    const events = await res.json();
    
    if (events.length === 0) {
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
          <button type="button" class="secondary" onclick="editEvent('${e.id}')">Modifica</button>
          <button type="button" class="danger" onclick="deleteEvent('${e.id}')">Elimina</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Errore caricamento lista eventi:', err);
  }
}

window.deleteEvent = async function(eventId) {
  if (!confirm('Sei sicuro di voler eliminare definitivamente questo evento?')) return;

  try {
    const res = await fetch(`/api/admin/events/${eventId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Evento eliminato con successo');
      loadAdminEvents();
    } else {
      alert('Errore durante l\'eliminazione dell\'evento');
    }
  } catch (err) {
    console.error('Errore eliminazione evento:', err);
  }
};

// ------------------------------------------------------------
// 3. EVENT LISTENERS E UTILITIES
// ------------------------------------------------------------

function setupFormListeners() {
  const form = document.getElementById('event-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Logica del form di salvataggio evento già esistente nel tuo progetto
    });
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
