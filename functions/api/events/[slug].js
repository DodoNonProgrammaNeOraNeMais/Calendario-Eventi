// GET /api/events/:slug
export async function onRequestGet({ params, request, env }) {
  const { slug } = params;

  const event = await env.DB.prepare(`SELECT * FROM events WHERE slug = ?`).bind(slug).first();
  if (!event) return new Response("Evento non trovato", { status: 404 });

  const participants = await env.DB.prepare(
    `SELECT name FROM participants WHERE event_id = ? ORDER BY created_at ASC`
  ).bind(event.id).all();

  const poll = await env.DB.prepare(`SELECT * FROM polls WHERE event_id = ?`).bind(event.id).first();

  let pollData = null;
  if (poll) {
    const options = await env.DB.prepare(
      `SELECT * FROM poll_options WHERE poll_id = ? ORDER BY id ASC`
    ).bind(poll.id).all();

    // Recuperiamo il token del votante dal cookie per identificare la sua scelta
    const cookie = request.headers.get("Cookie") || "";
    const match = cookie.match(/voter_id=([a-zA-Z0-9-]+)/);
    const voterToken = match ? match[1] : null;

    let myOptionId = null;
    if (voterToken) {
      const myVote = await env.DB.prepare(
        `SELECT option_id FROM votes WHERE poll_id = ? AND voter_token = ?`
      ).bind(poll.id, voterToken).first();
      if (myVote) myOptionId = myVote.option_id;
    }

    const optionsWithVotes = await Promise.all(
      (options.results || []).map(async (opt) => {
        const countRes = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM votes WHERE option_id = ?`
        ).bind(opt.id).first();

        // Escludiamo dai votanti del sondaggio gli utenti che sono già stati accettati (status = 'accepted')
        const votersRes = await env.DB.prepare(
          `SELECT voter_name FROM votes WHERE option_id = ? AND status != 'accepted' AND voter_name IS NOT NULL ORDER BY created_at ASC`
        ).bind(opt.id).all();

        const votersList = (votersRes.results || [])
          .map((v) => v.voter_name)
          .filter(Boolean)
          .join(", ");

        return {
          id: opt.id,
          label: opt.label,
          votes: countRes ? countRes.count : 0,
          voters: votersList,
        };
      })
    );

    const isOpen = new Date(poll.deadline) > new Date();

    pollData = {
      id: poll.id,
      question: poll.question,
      deadline: poll.deadline,
      isOpen,
      myOptionId,
      options: optionsWithVotes,
    };
  }

  return Response.json({
    ...event,
    participants: (participants.results || []).map((p) => p.name),
    poll: pollData,
  });
}

function getVoterToken(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/voter_id=([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}
