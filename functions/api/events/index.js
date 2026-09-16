export async function onRequestGet({ env }) {
  try {
    // 1. Recupera tutti gli eventi dal DB
    const eventsResult = await env.DB.prepare(
      `SELECT * FROM events ORDER BY start_date ASC`
    ).all();

    const events = eventsResult.results || [];

    // 2. Associa sondaggi e voti approvati ad ogni evento
    for (let event of events) {
      // Parsing sicuro dei partecipanti
      if (typeof event.participants === 'string') {
        try {
          event.participants = JSON.parse(event.participants);
        } catch (e) {
          event.participants = event.participants ? event.participants.split(',').map(p => p.trim()) : [];
        }
      }

      // Recupera eventuale sondaggio collegato
      const poll = await env.DB.prepare(
        `SELECT * FROM polls WHERE event_id = ?`
      ).bind(event.id).first();

      if (poll) {
        const options = await env.DB.prepare(
          `SELECT * FROM poll_options WHERE poll_id = ?`
        ).bind(poll.id).all();

        // Seleziona SOLO i voti accettati dall'admin
        const votes = await env.DB.prepare(
          `SELECT * FROM votes WHERE poll_id = ? AND status = 'accepted'`
        ).bind(poll.id).all();

        poll.options = options.results || [];
        poll.votes = votes.results || [];
        event.poll = poll;
      }
    }

    return new Response(JSON.stringify(events), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
