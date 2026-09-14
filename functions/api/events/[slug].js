// GET /api/events/:slug
export async function onRequestGet({ params, env, request }) {
  const event = await env.DB.prepare(`SELECT * FROM events WHERE slug = ?`).bind(params.slug).first();
  if (!event) return new Response("Evento non trovato", { status: 404 });

  const { results: participantRows } = await env.DB.prepare(`SELECT name FROM participants WHERE event_id = ? ORDER BY name COLLATE NOCASE`).bind(event.id).all();

  const poll = await env.DB.prepare(`SELECT * FROM polls WHERE event_id = ?`).bind(event.id).first();

  let pollData = null;
  if (poll) {
    const { results: options } = await env.DB.prepare(
      `SELECT po.id, po.label, GROUP_CONCAT(v.voter_name, ', ') AS voters, COUNT(v.id) AS votes
       FROM poll_options po
       LEFT JOIN votes v ON v.option_id = po.id
       WHERE po.poll_id = ?
       GROUP BY po.id
       ORDER BY po.id`
    ).bind(poll.id).all();

    const { results: detailedVotes } = await env.DB.prepare(
      `SELECT v.id as vote_id, v.voter_name, po.label as option_label 
       FROM votes v 
       JOIN poll_options po ON v.option_id = po.id 
       WHERE v.poll_id = ?
       ORDER BY v.created_at ASC`
    ).bind(poll.id).all();

    const voterToken = getVoterToken(request);
    let myOptionId = null;
    if (voterToken) {
      const myVote = await env.DB.prepare(`SELECT option_id FROM votes WHERE poll_id = ? AND voter_token = ?`).bind(poll.id, voterToken).first();
      if (myVote) myOptionId = myVote.option_id;
    }

    pollData = {
      id: poll.id,
      question: poll.question,
      deadline: poll.deadline,
      isOpen: new Date(poll.deadline) > new Date(),
      options,
      myOptionId,
      detailedVotes
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
