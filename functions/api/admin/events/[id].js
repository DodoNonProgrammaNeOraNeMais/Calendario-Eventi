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

    await env.DB.prepare(`
      UPDATE events 
      SET title = COALESCE(?, title), 
          description = COALESCE(?, description), 
          start_date = COALESCE(?, start_date), 
          end_date = COALESCE(?, end_date), 
          image_url = COALESCE(?, image_url), 
          participants = ?
      WHERE id = ? OR slug = ?
    `).bind(
      data.title || null,
      data.description !== undefined ? data.description : null,
      data.start_date || null,
      data.end_date || null,
      data.image_url !== undefined ? data.image_url : null,
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
    await env.DB.prepare("DELETE FROM events WHERE id = ? OR slug = ?").bind(id, id).run();
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
