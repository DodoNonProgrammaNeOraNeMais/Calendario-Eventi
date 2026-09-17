// functions/api/admin/events/[id].js
const POLL_OPTIONS = ["Sì", "No", "Forse"]; // opzioni standard per tutti i sondaggi

export async function onRequestPut({ params, request, env }) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return new Response("JSON non valido", { status: 400 });

    const { title, description, start_date, end_date, image_key, participants, poll } = body;
    if (!title || !start_date || !end_date) {
      return new Response("Titolo e date sono obbligatori", { status: 400 });
    }

    // 1. Recupera l'evento attuale per verificare se l'immagine è cambiata
    const currentEvent = await env.DB.prepare(`SELECT image_key FROM events WHERE id = ?`)
      .bind(params.id)
      .first();

    if (!currentEvent) {
      return new Response("Evento non trovato", { status: 404 });
    }

    // Se è stata caricata una nuova immagine e differisce dalla precedente, rimuovi la vecchia da R2
    if (image_key && currentEvent.image_key && currentEvent.image_key !== image_key) {
      await env.IMAGES.delete(currentEvent.image_key).catch(() => null);
    }

    const statements = [];

    // Update dell'evento
    statements.push(
      env.DB.prepare(
        `UPDATE events 
         SET title = ?, description = ?, start_date = ?, end_date = ?, image_key = COALESCE(?, image_key)
         WHERE id = ?`
      ).bind(title, description || "", start_date, end_date, image_key || null, params.id)
    );

    // Sostituisce la lista partecipanti
    await env.DB.prepare(`DELETE FROM participants WHERE event_id = ?`).bind(params.id).run();
    if (Array.isArray(participants) && participants.length) {
      const clean = participants.map((n) => n.trim()).filter(Boolean);
      for (const name of clean) {
        statements.push(
          env.DB.prepare(`INSERT INTO participants (event_id, name) VALUES (?, ?)`).bind(params.id, name)
        );
      }
    }

    // Gestione sondaggio
    const existingPoll = await env.DB.prepare(`SELECT id FROM polls WHERE event_id = ?`)
      .bind(params.id)
      .first();

    const wantsPoll = poll && poll.question && poll.deadline;

    if (wantsPoll) {
      let pollId = existingPoll ? existingPoll.id : crypto.randomUUID();
      if (existingPoll) {
        await env.DB.prepare(`DELETE FROM votes WHERE poll_id = ?`).bind(pollId).run();
        await env.DB.prepare(`UPDATE polls SET question = ?, deadline = ? WHERE id = ?`)
          .bind(poll.question, poll.deadline, pollId)
          .run();
        await env.DB.prepare(`DELETE FROM poll_options WHERE poll_id = ?`).bind(pollId).run();
      } else {
        await env.DB.prepare(
          `INSERT INTO polls (id, event_id, question, deadline) VALUES (?, ?, ?, ?)`
        )
          .bind(pollId, params.id, poll.question, poll.deadline)
          .run();
      }
      const stmt = env.DB.prepare(`INSERT INTO poll_options (poll_id, label) VALUES (?, ?)`);
      await env.DB.batch(options.map((label) => stmt.bind(pollId, label)));
    } else if (existingPoll) {
      // il sondaggio e' stato rimosso in modifica
      await env.DB.prepare(`DELETE FROM votes WHERE poll_id = ?`).bind(existingPoll.id).run();
      await env.DB.prepare(`DELETE FROM poll_options WHERE poll_id = ?`).bind(existingPoll.id).run();
      await env.DB.prepare(`DELETE FROM polls WHERE id = ?`).bind(existingPoll.id).run();
    }

    // Esegui tutte le modifiche atomicamente in batch
    await env.DB.batch(statements);

    return Response.json({ ok: true });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function onRequestDelete({ params, env }) {
  try {
    // 1. Recupera la chiave immagine da R2 per eliminarla
    const event = await env.DB.prepare(`SELECT image_key FROM events WHERE id = ?`)
      .bind(params.id)
      .first();

    if (event && event.image_key) {
      await env.IMAGES.delete(event.image_key).catch(() => null);
    }

    const poll = await env.DB.prepare(`SELECT id FROM polls WHERE event_id = ?`)
      .bind(params.id)
      .first();

    if (poll) {
      statements.push(env.DB.prepare(`DELETE FROM votes WHERE poll_id = ?`).bind(poll.id));
      statements.push(env.DB.prepare(`DELETE FROM poll_options WHERE poll_id = ?`).bind(poll.id));
      statements.push(env.DB.prepare(`DELETE FROM polls WHERE id = ?`).bind(poll.id));
    }
    statements.push(env.DB.prepare(`DELETE FROM events WHERE id = ?`).bind(params.id));

    await env.DB.batch(statements);

    return Response.json({ ok: true });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
