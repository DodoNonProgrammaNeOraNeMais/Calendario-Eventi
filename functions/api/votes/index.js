// POST /api/votes { pollId, optionId, voterName } -> vota o cambia voto
// DELETE /api/votes?pollId=... -> ritira il voto

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !body.pollId || !body.optionId) {
    return new Response("Dati mancanti", { status: 400 });
  }

  const poll = await env.DB.prepare(`SELECT * FROM polls WHERE id = ?`).bind(body.pollId).first();
  if (!poll) return new Response("Sondaggio non trovato", { status: 404 });
  if (new Date(poll.deadline) <= new Date()) {
    return new Response("Il sondaggio e' scaduto", { status: 403 });
  }

  const option = await env.DB.prepare(`SELECT id FROM poll_options WHERE id = ? AND poll_id = ?`).bind(body.optionId, body.pollId).first();
  if (!option) return new Response("Opzione non valida", { status: 400 });

  const { token, isNew } = getOrCreateVoterToken(request);

  const existingVote = await env.DB.prepare(`SELECT voter_name FROM votes WHERE poll_id = ? AND voter_token = ?`).bind(body.pollId, token).first();
  
  let voterName = body.voterName ? body.voterName.trim() : null;
  if (!voterName && existingVote) {
    voterName = existingVote.voter_name;
  }
  if (!voterName) {
    return new Response("Il nome è obbligatorio per votare", { status: 400 });
  }

  // Verifica se esiste già un voto per questo sondaggio con lo stesso nome (case-insensitive)
  const existingByName = await env.DB.prepare(
    `SELECT * FROM votes WHERE poll_id = ? AND LOWER(voter_name) = LOWER(?)`
  ).bind(body.pollId, voterName).first();

  if (existingByName) {
    // Aggiorna il voto esistente mantenendo/impostando lo stato su 'pending'
    await env.DB.prepare(
      `UPDATE votes SET option_id = ?, voter_name = ?, voter_token = ?, status = 'pending', created_at = datetime('now') WHERE id = ?`
    ).bind(body.optionId, voterName, token, existingByName.id).run();
  } else {
    // Inserisce il nuovo voto salvando di default lo stato 'pending'
    await env.DB.prepare(
      `INSERT INTO votes (poll_id, option_id, voter_token, voter_name, status) VALUES (?, ?, ?, ?, 'pending')
       ON CONFLICT(poll_id, voter_token)
       DO UPDATE SET option_id = excluded.option_id, voter_name = excluded.voter_name, status = 'pending', created_at = datetime('now')`
    )
      .bind(body.pollId, body.optionId, token, voterName)
      .run();
  }

  const headers = new Headers({ "Content-Type": "application/json" });
  if (isNew) {
    headers.append("Set-Cookie", `voter_id=${token}; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly`);
  }
  return new Response(JSON.stringify({ ok: true }), { headers });
}

export async function onRequestDelete({ request, env }) {
  const url = new URL(request.url);
  const pollId = url.searchParams.get("pollId");
  if (!pollId) return new Response("pollId mancante", { status: 400 });

  const token = getVoterToken(request);
  if (!token) return Response.json({ ok: true });

  const poll = await env.DB.prepare(`SELECT * FROM polls WHERE id = ?`).bind(pollId).first();
  if (poll && new Date(poll.deadline) <= new Date()) {
    return new Response("Il sondaggio e' scaduto", { status: 403 });
  }

  await env.DB.prepare(`DELETE FROM votes WHERE poll_id = ? AND voter_token = ?`).bind(pollId, token).run();
  return Response.json({ ok: true });
}

function getVoterToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/voter_id=([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

function getOrCreateVoterToken(request) {
  const existing = getVoterToken(request);
  if (existing) return { token: existing, isNew: false };
  return { token: crypto.randomUUID(), isNew: true };
}
