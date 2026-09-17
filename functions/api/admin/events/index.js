const POLL_OPTIONS = ["Sì", "No", "Forse"];

export async function onRequestGet({ params, env }) {
  try {
    const event = await env.DB.prepare(`SELECT * FROM events WHERE id = ?`).bind(params.id).first();
    if (!event) return new Response("Evento non trovato", { status: 404 });

    const participantsRes = await env.DB.prepare(
      `SELECT name FROM participants WHERE event_id = ? ORDER BY id ASC`
    ).bind(event.id).all();

    const poll = await env.DB.prepare(`SELECT * FROM polls WHERE event_id = ?`).bind(event.id).first();

    let votes = [];
    if (poll) {
      const votesRes = await env.DB.prepare(
        `SELECT v.id, v.voter_name, v.status, po.label as option_label 
         FROM votes v
         JOIN poll_options po ON v.option_id = po.id
         WHERE v.poll_id = ?
         ORDER BY v.created_at DESC`
      ).bind(poll.id).all();

      votes = votesRes.results || [];
    }

    return Response.json({
      ...event,
      image_url: event.image_key ? `/api/images/${event.image_key}` : null,
      participants: (participantsRes.results || []).map((p) => p.name),
      poll: poll ? { ...poll, votes } : null,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPut({ params, request, env }) {
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

    const existingPoll = await env.DB.prepare(`SELECT id FROM polls WHERE event_id = ?`)
      .bind(params.id)
      .first();

    const wantsPoll = poll && poll.question && poll.deadline;

    if (wantsPoll) {
      if (existingPoll) {
        statements.push(
          env.DB.prepare(`UPDATE polls SET question = ?, deadline = ? WHERE id = ?`)
            .bind(poll.question, poll.deadline, existingPoll.id)
        );
      } else {
        const pollId = crypto.randomUUID();
        statements.push(
          env.DB.prepare(`INSERT INTO polls (id, event_id, question, deadline) VALUES (?, ?, ?, ?)`)
            .bind(pollId, params.id, poll.question, poll.deadline)
        );
        for (const label of POLL_OPTIONS) {
          statements.push(
            env.DB.prepare(`INSERT INTO poll_options (poll_id, label) VALUES (?, ?)`).bind(pollId, label)
          );
        }
      }
    } else if (existingPoll) {
      statements.push(env.DB.prepare(`DELETE FROM votes WHERE poll_id = ?`).bind(existingPoll.id));
      statements.push(env.DB.prepare(`DELETE FROM poll_options WHERE poll_id = ?`).bind(existingPoll.id));
      statements.push(env.DB.prepare(`DELETE FROM polls WHERE id = ?`).bind(existingPoll.id));
    }

    await env.DB.batch(statements);
    return Response.json({ ok: true });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestDelete({ params, env }) {
  try {
    const event = await env.DB.prepare(`SELECT image_key FROM events WHERE id = ?`)
      .bind(params.id)
      .first();

    if (event && event.image_key) {
      await env.IMAGES.delete(event.image_key).catch(() => null);
    }

    const poll = await env.DB.prepare(`SELECT id FROM polls WHERE event_id = ?`)
      .bind(params.id)
      .first();

    const statements = [];
    statements.push(env.DB.prepare(`DELETE FROM participants WHERE event_id = ?`).bind(params.id));
    if (poll) {
      statements.push(env.DB.prepare(`DELETE FROM votes WHERE poll_id = ?`).bind(poll.id));
      statements.push(env.DB.prepare(`DELETE FROM poll_options WHERE poll_id = ?`).bind(poll.id));
      statements.push(env.DB.prepare(`DELETE FROM polls WHERE id = ?`).bind(poll.id));
    }
    statements.push(env.DB.prepare(`DELETE FROM events WHERE id = ?`).bind(params.id));

    await env.DB.batch(statements);
    return Response.json({ ok: true });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
