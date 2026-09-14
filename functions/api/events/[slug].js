// GET /api/events/:slug
// Dettaglio pubblico di un evento: partecipanti, sondaggio con conteggio voti
// e (se il visitatore ha già votato) l'opzione che ha scelto.
export async function onRequestGet({ params, env, request }) {
  const event = await env.DB.prepare(`SELECT * FROM events WHERE slug = ?`)
    .bind(params.slug)
    .first();

  if (!event) {
    return new Response("Evento non trovato", { status: 404 });
  }

  const { results: participantRows } = await env.DB.prepare(
    `SELECT name FROM participants WHERE event_id = ? ORDER BY name COLLATE NOCASE`
  )
    .bind(event.id)
    .all();

  const poll = await env.DB.prepare(`SELECT * FROM polls WHERE event_id = ?`)
    .bind(event.id)
    .first();

  let pollData = null;
  if (poll) {
    const { results: options } = await env.DB.prepare(
      `SELECT po.id, po.label, COUNT(v.id) AS votes
       FROM poll_options po
       LEFT JOIN votes v ON v.option_id = po.id
       WHERE po.poll_id = ?
       GROUP BY po.id
       ORDER BY po.id`
    )
      .bind(poll.id)
      .all();

    const voterToken = getVoterToken(request);
    let myOptionId = null;
    if (voterToken) {
      const myVote = await env.DB.prepare(
        `SELECT option_id FROM votes WHERE poll_id = ? AND voter_token = ?`
      )
        .bind(poll.id, voterToken)
        .first();
      if (myVote) myOptionId = myVote.option_id;
    }

    pollData = {
      id: poll.id,
      question: poll.question,
      deadline: poll.deadline,
      isOpen: new Date(poll.deadline) > new Date(),
      options,
      myOptionId,
    };
  }

  return Response.json({
    ...event,
    image_url: event.image_key ? `/api/images/${event.image_key}` : null,
    participants: participantRows.map((p) => p.name),
    poll: pollData,
  });
}

function getVoterToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/voter_id=([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}
