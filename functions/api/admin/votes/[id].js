export async function onRequestPut(context) {
  const { request, env, params } = context;
  const voteId = params.id;

  try {
    const body = await request.json().catch(() => ({}));

    if (body.action === 'accept') {
      const vote = await env.DB.prepare(
        "SELECT event_id, voter_name, user_name FROM votes WHERE id = ?"
      ).bind(voteId).first();

      if (!vote) {
        return new Response(JSON.stringify({ error: "Voto non trovato" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      await env.DB.prepare(
        "UPDATE votes SET status = 'accepted' WHERE id = ?"
      ).bind(voteId).run();

      const userName = vote.voter_name || vote.user_name;
      const event = await env.DB.prepare(
        "SELECT participants FROM events WHERE id = ?"
      ).bind(vote.event_id).first();

      if (event && userName) {
        let currentParticipants = [];
        if (event.participants) {
          try {
            currentParticipants = typeof event.participants === 'string' 
              ? JSON.parse(event.participants) 
              : event.participants;
          } catch (e) {
            currentParticipants = event.participants.split(',').map(p => p.trim());
          }
        }

        if (!currentParticipants.includes(userName)) {
          currentParticipants.push(userName);
          await env.DB.prepare(
            "UPDATE events SET participants = ? WHERE id = ?"
          ).bind(JSON.stringify(currentParticipants), vote.event_id).run();
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Azione non valida" }), { status: 400 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const voteId = params.id;

  try {
    await env.DB.prepare("DELETE FROM votes WHERE id = ?").bind(voteId).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
