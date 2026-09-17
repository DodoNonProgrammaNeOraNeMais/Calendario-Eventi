document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const eventForm = document.getElementById('eventForm');
    const formTitle = document.getElementById('formTitle');
    const eventIdInput = document.getElementById('eventId');
    const titleInput = document.getElementById('title');
    const dateInput = document.getElementById('date');
    const locationInput = document.getElementById('location');
    const descriptionInput = document.getElementById('description');
    const imageKeyInput = document.getElementById('imageKey');
    const imageFileInput = document.getElementById('imageFile');
    const uploadStatus = document.getElementById('uploadStatus');
    const imagePreview = document.getElementById('imagePreview');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const eventsList = document.getElementById('eventsList');

    // Modal elements
    const votesModal = document.getElementById('votesModal');
    const modalTitle = document.getElementById('modalTitle');
    const votesList = document.getElementById('votesList');
    const closeModal = document.querySelector('.close');

    // Load initial events
    loadEvents();

    // Image Upload Handler
    imageFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        uploadStatus.textContent = 'Caricamento immagine in corso...';
        uploadStatus.className = 'status-message loading';

        try {
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Errore durante l\'upload');
            }

            imageKeyInput.value = data.key;
            imagePreview.src = `/api/images/${data.key}`;
            imagePreview.style.display = 'block';
            
            uploadStatus.textContent = 'Immagine caricata con successo!';
            uploadStatus.className = 'status-message success';
        } catch (err) {
            uploadStatus.textContent = err.message;
            uploadStatus.className = 'status-message error';
            imageFileInput.value = '';
        }
    });

    // Form Submit Handler (Create/Update)
    eventForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = eventIdInput.value;
        const payload = {
            title: titleInput.value.trim(),
            date: dateInput.value,
            location: locationInput.value.trim(),
            description: descriptionInput.value.trim(),
            image_key: imageKeyInput.value || null
        };

        const isUpdate = !!id;
        const url = isUpdate ? `/api/admin/events/${id}` : '/api/admin/events';
        const method = isUpdate ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Errore durante il salvataggio');
            }

            resetForm();
            loadEvents();
        } catch (err) {
            alert(err.message);
        }
    });

    // Cancel Edit
    cancelEditBtn.addEventListener('click', resetForm);

    function resetForm() {
        eventIdInput.value = '';
        eventForm.reset();
        imageKeyInput.value = '';
        imagePreview.style.display = 'none';
        imagePreview.src = '';
        uploadStatus.textContent = '';
        uploadStatus.className = 'status-message';
        formTitle.textContent = 'Aggiungi Nuovo Evento';
        cancelEditBtn.style.display = 'none';
    }

    // Load Events List
    async function loadEvents() {
        try {
            const res = await fetch('/api/admin/events', {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Errore nel caricamento degli eventi');
            const events = await res.json();
            renderEvents(events);
        } catch (err) {
            eventsList.innerHTML = `<tr><td colspan="5" class="error">${err.message}</td></tr>`;
        }
    }

    // Render Events Table
    function renderEvents(events) {
        if (!events || events.length === 0) {
            eventsList.innerHTML = '<tr><td colspan="5">Nessun evento trovato.</td></tr>';
            return;
        }

        eventsList.innerHTML = events.map(event => {
            const dateStr = new Date(event.date).toLocaleDateString('it-IT', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });

            return `
                <tr>
                    <td>
                        <strong>${escapeHtml(event.title)}</strong>
                        ${event.description ? `<br><small class="text-muted">${escapeHtml(event.description.substring(0, 50))}${event.description.length > 50 ? '...' : ''}</small>` : ''}
                    </td>
                    <td>${dateStr}</td>
                    <td>${escapeHtml(event.location || '-')}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-votes-btn" data-id="${event.id}" data-title="${escapeHtml(event.title)}">
                            ${event.vote_count || 0} Voti
                        </button>
                    </td>
                    <td class="actions">
                        <button class="btn btn-sm btn-warning edit-btn" data-event='${JSON.stringify(event).replace(/'/g, "&apos;")}'>Modifica</button>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${event.id}">Elimina</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach event listeners to dynamically created buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const event = JSON.parse(e.target.dataset.event);
                startEdit(event);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                deleteEvent(e.target.dataset.id);
            });
        });

        document.querySelectorAll('.view-votes-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const title = e.target.dataset.title;
                showVotesModal(id, title);
            });
        });
    }

    function startEdit(event) {
        formTitle.textContent = 'Modifica Evento';
        eventIdInput.value = event.id;
        titleInput.value = event.title;
        dateInput.value = event.date;
        locationInput.value = event.location || '';
        descriptionInput.value = event.description || '';
        
        if (event.image_key) {
            imageKeyInput.value = event.image_key;
            imagePreview.src = `/api/images/${event.image_key}`;
            imagePreview.style.display = 'block';
        } else {
            imageKeyInput.value = '';
            imagePreview.style.display = 'none';
        }

        cancelEditBtn.style.display = 'inline-block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function deleteEvent(id) {
        if (!confirm('Sei sicuro di voler eliminare questo evento? Verranno eliminati anche tutti i voti associati.')) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/events/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Errore durante l\'eliminazione');
            }

            loadEvents();
        } catch (err) {
            alert(err.message);
        }
    }

    // Modal Votes Handler
    async function showVotesModal(eventId, eventTitle) {
        modalTitle.textContent = `Voti per: ${eventTitle}`;
        votesList.innerHTML = '<p class="loading">Caricamento voti...</p>';
        votesModal.style.display = 'block';

        try {
            const res = await fetch(`/api/admin/votes/${eventId}`, {
                credentials: 'include'
            });

            if (!res.ok) {
                throw new Error('Errore durante il recupero dei voti');
            }

            const votes = await res.json();

            if (!votes || votes.length === 0) {
                votesList.innerHTML = '<p>Nessun voto registrato per questo evento.</p>';
                return;
            }

            votesList.innerHTML = `
                <ul class="votes-modal-list">
                    ${votes.map(v => `
                        <li>
                            <span class="voter-name">${escapeHtml(v.voter_name)}</span>
                            <span class="vote-date">${new Date(v.created_at).toLocaleString('it-IT')}</span>
                        </li>
                    `).join('')}
                </ul>
            `;
        } catch (err) {
            votesList.innerHTML = `<p class="error">${err.message}</p>`;
        }
    }

    // Close Modal Events
    closeModal.addEventListener('click', () => {
        votesModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === votesModal) {
            votesModal.style.display = 'none';
        }
    });

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
