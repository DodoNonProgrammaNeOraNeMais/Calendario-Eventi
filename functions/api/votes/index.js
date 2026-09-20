// POST /api/votes { pollId, optionId, voterName, turnstileToken } -> vota o cambia voto
// DELETE /api/votes?pollId=... -> ritira il voto

// Verifica il token Turnstile generato dal widget lato client contro l'API di Cloudflare.
async function verifyTurnstile(token, ip, secret) {
  if (!token || !secret) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip || "" }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (e) {
    return false;
  }
}

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: `votes-post:${ip}` });
    if (!success) {
      return new Response("Troppe richieste, riprova tra un minuto", { status: 429 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.pollId || !body.optionId) {
    return new Response("Dati mancanti", { status: 400 });
  }

  // 1. Recuperiamo subito l'identità dell'utente (cookie) e verifichiamo se ha già votato
  const { token, isNew } = getOrCreateVoterToken(request);
  const existingVote = await env.DB.prepare(`SELECT id, voter_name FROM votes WHERE poll_id = ? AND voter_token = ?`).bind(body.pollId, token).first();

  // 2. Turnstile è obbligatorio SOLO se l'utente non ha un voto preesistente in questo sondaggio
  if (!existingVote) {
    const turnstileOk = await verifyTurnstile(body.turnstileToken, ip, env.TURNSTILE_SECRET_KEY);
    if (!turnstileOk) {
      return new Response("Verifica anti-spam non superata, riprova", { status: 403 });
    }
  }

  const poll = await env.DB.prepare(`SELECT * FROM polls WHERE id = ?`).bind(body.pollId).first();
  if (!poll) return new Response("Sondaggio non trovato", { status: 404 });
  if (new Date(poll.deadline) <= new Date()) {
    return new Response("Il sondaggio e' scaduto", { status: 403 });
  }

  const option = await env.DB.prepare(`SELECT id FROM poll_options WHERE id = ? AND poll_id = ?`).bind(body.optionId, body.pollId).first();
  if (!option) return new Response("Opzione non valida", { status: 400 });
  
  let voterName = body.voterName ? body.voterName.trim() : null;
  if (!voterName && existingVote) {
    voterName = existingVote.voter_name;
  }
  if (!voterName) {
    return new Response("Il nome è obbligatorio per votare", { status: 400 });
  }
  if (!/\S+\s+\S+/.test(voterName)) {
    return new Response("Inserisci sia il nome che il cognome (es. Mario Rossi)", { status: 400 });
  }

  await env.DB.prepare(
    `INSERT INTO votes (poll_id, option_id, voter_token, voter_name) VALUES (?, ?, ?, ?)
     ON CONFLICT(poll_id, voter_token)
     DO UPDATE SET option_id = excluded.option_id, voter_name = excluded.voter_name, created_at = datetime('now'), status = 'pending'`
  )
    .bind(body.pollId, body.optionId, token, voterName)
    .run();

  // Se questo browser stava cambiando un voto già accettato, rimuoviamo il partecipante finché l'admin non lo rivaluta
  if (existingVote) {
    await env.DB.prepare(`DELETE FROM participants WHERE vote_id = ?`).bind(existingVote.id).run();
  }

  const headers = new Headers({ "Content-Type": "application/json" });
  if (isNew) {
    headers.append("Set-Cookie", `voter_id=${token}; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly`);
  }
  return new Response(JSON.stringify({ ok: true }), { headers });
}

export async function onRequestDelete({ request, env }) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: `votes-delete:${ip}` });
    if (!success) {
      return new Response("Troppe richieste, riprova tra un minuto", { status: 429 });
    }
  }

  const url = new URL(request.url);
  const pollId = url.searchParams.get("pollId");
  if (!pollId) return new Response("pollId mancante", { status: 400 });

  const token = getVoterToken(request);
  if (!token) return Response.json({ ok: true });

  const poll = await env.DB.prepare(`SELECT * FROM polls WHERE id = ?`).bind(pollId).first();
  if (poll && new Date(poll.deadline) <= new Date()) {
    return new Response("Il sondaggio e' scaduto", { status: 403 });
  }

  const existing = await env.DB.prepare(`SELECT id FROM votes WHERE poll_id = ? AND voter_token = ?`).bind(pollId, token).first();
  if (existing) {
    await env.DB.prepare(`DELETE FROM participants WHERE vote_id = ?`).bind(existing.id).run();
    await env.DB.prepare(`DELETE FROM votes WHERE id = ?`).bind(existing.id).run();
  }
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
