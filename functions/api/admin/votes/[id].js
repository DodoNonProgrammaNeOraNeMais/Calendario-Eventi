export async function onRequestDelete({ params, env }) {
  try {
    await env.DB.prepare(`DELETE FROM votes WHERE id = ?`).bind(params.id).run();
    return Response.json({ ok: true });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
