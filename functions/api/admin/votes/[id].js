// functions/api/admin/votes/[id].js
// PATCH /api/admin/votes/:id { status: 'accepted' | 'rejected' | 'pending' } -> decisione dell'admin sul voto
// DELETE /api/admin/votes/:id -> elimina definitivamente il voto (e il partecipante eventualmente collegato)

export async function onRequestPatch({ params, request, env }) {
  const voteId = params.id;
  const body = await request.json().catch(() => null);

  if (!body || !body.status || !["accepted", "rejected"].includes(body.status)) {
    return new Response("Stato non valido", { status: 400 });
  }

  const vote = await env.DB.prepare(
    `SELECT v.*, e.id as event_id FROM votes v
     JOIN polls p ON v.poll_id = p.id
     JOIN events e ON p.event_id = e.id
     WHERE v.id = ?`
  ).bind(voteId).first();

  if (!vote) {
    return new Response("Voto non trovato", { status: 404 });
  }

  if (body.status === "accepted") {
    // Segna il voto come accettato
    await env.DB.prepare(`UPDATE votes SET status = 'accepted' WHERE id = ?`).bind(voteId).run();

    // Aggiungi ai partecipanti se non presente
    await env.DB.prepare(
      `INSERT INTO participants (event_id, name, vote_id) VALUES (?, ?, ?)
       ON CONFLICT(event_id, vote_id) DO UPDATE SET name = excluded.name`
    ).bind(vote.event_id, vote.voter_name, voteId).run();
  } else if (body.status === "rejected") {
    // Segna come rifiutato
    await env.DB.prepare(`UPDATE votes SET status = 'rejected' WHERE id = ?`).bind(voteId).run();

    // Rimuovi dalla lista dei partecipanti confermati dell'evento
    await env.DB.prepare(`DELETE FROM participants WHERE vote_id = ?`).bind(voteId).run();
  }

  return Response.json({ ok: true });
}

export async function onRequestDelete({ params, env }) {
  const voteId = params.id;
  try {
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM participants WHERE vote_id = ?`).bind(voteId),
      env.DB.prepare(`DELETE FROM votes WHERE id = ?`).bind(voteId),
    ]);
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
