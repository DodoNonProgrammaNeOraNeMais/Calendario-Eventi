export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return new Response("JSON non valido", { status: 400 });

    const { title, description, start_date, end_date, image_key, participants, poll } = body;
    if (!title || !start_date || !end_date) {
      return new Response("Titolo e date sono obbligatori", { status: 400 });
    }

    const currentEvent = await env.DB.prepare(`SELECT image_key FROM events WHERE id = ?`)
      .bind(params.id)
      .first();

    if (!currentEvent) {
      return new Response("Evento non trovato", { status: 404 });
    }

    if (image_key && currentEvent.image_key && currentEvent.image_key !== image_key) {
      await env.IMAGES.delete(currentEvent.image_key).catch(() => null);
    }

    const statements = [];

    statements.push(
      env.DB.prepare(
        `UPDATE events 
         SET title = ?, description = ?, start_date = ?, end_date = ?, image_key = COALESCE(?, image_key)
         WHERE id = ?`
      ).bind(title, description || "", start_date, end_date, image_key || null, params.id)
    );

    // Mantiene i partecipanti aggiunti dai voti (vote_id IS NOT NULL) e aggiorna quelli manuali
    statements.push(
      env.DB.prepare(`DELETE FROM participants WHERE event_id = ? AND vote_id IS NULL`).bind(params.id)
    );

    if (Array.isArray(participants) && participants.length) {
      const clean = participants.map((n) => n.trim()).filter(Boolean);
      for (const name of clean) {
        statements.push(
          env.DB.prepare(`INSERT INTO participants (event_id, name) VALUES (?, ?)`).bind(params.id, name)
        );
      }
    }

    const options = poll && Array.isArray(poll.options) ? poll.options.map((o) => o.trim()).filter(Boolean) : [];
    const wantsPoll = poll && poll.question && poll.deadline && options.length >= 2;

    if (wantsPoll) {
      const pollId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO polls (id, event_id, question, deadline) VALUES (?, ?, ?, ?)`
      )
        .bind(pollId, id, poll.question, poll.deadline)
        .run();

      const stmt = env.DB.prepare(`INSERT INTO poll_options (poll_id, label) VALUES (?, ?)`);
      await env.DB.batch(options.map((label) => stmt.bind(pollId, label)));
    }
    statements.push(env.DB.prepare(`DELETE FROM events WHERE id = ?`).bind(params.id));

    await env.DB.batch(statements);
    return Response.json({ ok: true });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
