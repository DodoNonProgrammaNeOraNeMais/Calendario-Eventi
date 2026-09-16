export async function onRequestGet(context) {
  const { env, params } = context;
  const slug = params.slug;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 1. Recupera l'evento
  const event = await env.DB.prepare("SELECT * FROM events WHERE slug = ?").bind(slug).first();
  if (!event) {
    return new Response(JSON.stringify({ error: "Event not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  let participants = [];
  try {
    participants = JSON.parse(event.participants || "[]");
  } catch (e) {
    participants = [];
  }

  // 2. Recupera il sondaggio associato se presente
  const poll = await env.DB.prepare("SELECT * FROM polls WHERE event_id = ?").bind(event.id).first();
  let pollData = null;

  if (poll) {
    // Recupera le opzioni con il conteggio dei voti e l'elenco dei nomi dei votanti
    const { results: options } = await env.DB.prepare(`
      SELECT 
        po.id, 
        po.label, 
        COUNT(v.id) as votes,
        GROUP_CONCAT(v.voter_name, '|||') as voters_raw
      FROM poll_options po
      LEFT JOIN votes v ON po.id = v.option_id
      WHERE po.poll_id = ?
      GROUP BY po.id
      ORDER BY po.id ASC
    `).bind(poll.id).all();

    const now = new Date().toISOString();
    const isOpen = !poll.deadline || poll.deadline > now;

    pollData = {
      id: poll.id,
      question: poll.question,
      deadline: poll.deadline,
      isOpen,
      options: options.map(o => {
        const votersList = o.voters_raw ? o.voters_raw.split('|||').filter(Boolean) : [];
        return {
          id: o.id,
          label: o.label,
          votes: Number(o.votes || 0),
          votersList: votersList,
          voters: votersList.join(', ')
        };
      })
    };
  }

  const result = {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    start_date: event.start_date,
    end_date: event.end_date,
    image_url: event.image_url,
    participants,
    poll: pollData
  };

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" }
  });
}
