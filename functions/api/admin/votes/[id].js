export async function onRequestPut(context) {
  const { request, env, params } = context;
  const voteId = params.id;

  try {
    const body = await request.json();

    if (body.action === 'accept') {
      // 1. Recupera i dettagli del voto prima di aggiornarlo
      const vote = await env.DB.prepare(
        "SELECT event_id, user_name FROM votes WHERE id = ?"
      ).bind(voteId).first();

      if (!vote) {
        return new Response(JSON.stringify({ error: "Voto non trovato" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 2. Imposta lo stato del voto su 'accepted'
      await env.DB.prepare(
        "UPDATE votes SET status = 'accepted' WHERE id = ?"
      ).bind(voteId).run();

      // 3. Recupera l'evento corrente per aggiornare i partecipanti
      const event = await env.DB.prepare(
        "SELECT participants FROM events WHERE id = ?"
      ).bind(vote.event_id).first();

      if (event) {
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

        // Aggiunge il partecipante se non è già presente in lista
        if (!currentParticipants.includes(vote.user_name)) {
          currentParticipants.push(vote.user_name);
          const updatedParticipantsJson = JSON.stringify(currentParticipants);

          await env.DB.prepare(
            "UPDATE events SET participants = ? WHERE id = ?"
          ).bind(updatedParticipantsJson, vote.event_id).run();
        }
      }

      return new Response(JSON.stringify({ success: true, status: 'accepted' }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Azione non valida" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const voteId = params.id;

  try {
    // Cancella o rifiuta la richiesta eliminandola dalla tabella votes
    const result = await env.DB.prepare(
      "DELETE FROM votes WHERE id = ?"
    ).bind(voteId).run();

    return new Response(JSON.stringify({ success: true, deleted: result.meta.changes }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
