// PUT /api/admin/events/:id -> aggiorna un evento (dati, partecipanti, sondaggio)
// DELETE /api/admin/events/:id -> elimina l'evento e tutto cio' che e' collegato
// Protetto da Cloudflare Access (vedi README, applicazione su /admin*).

export async function onRequestPut({ params, request, env }) {
  const body = await request.json().catch(() => null);
  if (!body) return new Response("JSON non valido", { status: 400 });

  const { title, description, start_date, end_date, image_key, participants, poll } = body;
  if (!title || !start_date || !end_date) {
    return new Response("Titolo e date sono obbligatori", { status: 400 });
  }

  await env.DB.prepare(
    `UPDATE events
     SET title = ?, description = ?, start_date = ?, end_date = ?, image_key = COALESCE(?, image_key)
     WHERE id = ?`
  )
    .bind(title, description || "", start_date, end_date, image_key || null, params.id)
    .run();

  // Sostituisce la lista partecipanti
  await env.DB.prepare(`DELETE FROM participants WHERE event_id = ?`).bind(params.id).run();
  if (Array.isArray(participants) && participants.length) {
    const clean = participants.map((n) => n.trim()).filter(Boolean);
    if (clean.length) {
      const stmt = env.DB.prepare(`INSERT INTO participants (event_id, name) VALUES (?, ?)`);
      await env.DB.batch(clean.map((name) => stmt.bind(params.id, name)));
    }
  }

  const existingPoll = await env.DB.prepare(`SELECT id FROM polls WHERE event_id = ?`)
    .bind(params.id)
    .first();

  const options = poll && Array.isArray(poll.options) ? poll.options.map((o) => o.trim()).filter(Boolean) : [];
  const wantsPoll = poll && poll.question && poll.deadline && options.length >= 2;

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

  return Response.json({ ok: true });
}

export async function onRequestDelete({ params, env }) {
  const poll = await env.DB.prepare(`SELECT id FROM polls WHERE event_id = ?`)
    .bind(params.id)
    .first();

  if (poll) {
    await env.DB.prepare(`DELETE FROM votes WHERE poll_id = ?`).bind(poll.id).run();
    await env.DB.prepare(`DELETE FROM poll_options WHERE poll_id = ?`).bind(poll.id).run();
    await env.DB.prepare(`DELETE FROM polls WHERE id = ?`).bind(poll.id).run();
  }
  await env.DB.prepare(`DELETE FROM participants WHERE event_id = ?`).bind(params.id).run();
  await env.DB.prepare(`DELETE FROM events WHERE id = ?`).bind(params.id).run();

  return Response.json({ ok: true });
}
