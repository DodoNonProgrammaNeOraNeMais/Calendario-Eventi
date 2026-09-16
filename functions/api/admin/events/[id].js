// PUT /api/admin/events/:id -> aggiorna un evento (dati, partecipanti, sondaggio)
// DELETE /api/admin/events/:id -> elimina l'evento e tutto cio' che e' collegato
// Protetto da Cloudflare Access (vedi README, applicazione su /admin*).

export async function onRequestPut(context) {
  const { env, params, request } = context;
  const id = params.id;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const data = await request.json();
    const participantsJson = JSON.stringify(data.participants || []);

    // Aggiorna sia i campi generali che la lista partecipanti
    await env.DB.prepare(`
      UPDATE events 
      SET title = ?, description = ?, start_date = ?, end_date = ?, image_url = ?, participants = ?
      WHERE id = ? OR slug = ?
    `).bind(
      data.title,
      data.description || "",
      data.start_date,
      data.end_date,
      data.image_url || "",
      participantsJson,
      id,
      id
    ).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const id = params.id;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(id).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
