// functions/api/admin/votes/[id].js
// PATCH /api/admin/votes/:id { status: 'accepted' | 'rejected' | 'pending' } -> decisione dell'admin sul voto
// DELETE /api/admin/votes/:id -> elimina definitivamente il voto (e il partecipante eventualmente collegato)

export async function onRequestPatch({ params, request, env }) {
  const voteId = params.id;
  try {
    const body = await request.json().catch(() => null);
    const status = body && body.status;
    if (!["accepted", "rejected", "pending"].includes(status)) {
      return Response.json({ error: "Stato non valido" }, { status: 400 });
    }

    const vote = await env.DB.prepare(
      `SELECT v.id, v.voter_name, v.status, po.label AS option_label, p.event_id
       FROM votes v
       JOIN poll_options po ON po.id = v.option_id
       JOIN polls p ON p.id = v.poll_id
       WHERE v.id = ?`
    ).bind(voteId).first();

    if (!vote) return Response.json({ error: "Voto non trovato" }, { status: 404 });

    if (status === "accepted" && vote.option_label.trim().toLowerCase() === "no") {
      return Response.json({ error: "Non si può accettare un voto 'No'" }, { status: 400 });
    }

    // Una richiesta rifiutata non può essere riaccettata dall'admin: l'unico modo per
    // rimetterla in gioco è che la persona stessa rivoti (il che riporta il voto a "pending").
    if (status === "accepted" && vote.status === "rejected") {
      return Response.json({ error: "Richiesta già rifiutata: può essere riconsiderata solo se la persona rivota" }, { status: 400 });
    }

    const statements = [
      env.DB.prepare(`UPDATE votes SET status = ? WHERE id = ?`).bind(status, voteId),
    ];

    if (status === "accepted") {
      // Evita duplicati: non aggiunge se questo voto ha già generato un partecipante,
      // o se una persona con lo stesso nome è già nella lista (aggiunta a mano o da un altro voto).
      const alreadyLinked = await env.DB.prepare(`SELECT id FROM participants WHERE vote_id = ?`).bind(voteId).first();
      const duplicateByName = await env.DB.prepare(
        `SELECT id FROM participants WHERE event_id = ? AND LOWER(name) = LOWER(?)`
      ).bind(vote.event_id, vote.voter_name).first();

      if (!alreadyLinked && !duplicateByName) {
        statements.push(
          env.DB.prepare(`INSERT INTO participants (event_id, name, vote_id) VALUES (?, ?, ?)`)
            .bind(vote.event_id, vote.voter_name, voteId)
        );
      }
    } else {
      // Rifiutato o rimesso in sospeso: rimuove SOLO il partecipante aggiunto in automatico da questo voto,
      // senza toccare eventuali nomi inseriti a mano dall'admin.
      statements.push(env.DB.prepare(`DELETE FROM participants WHERE vote_id = ?`).bind(voteId));
    }

    await env.DB.batch(statements);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
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
