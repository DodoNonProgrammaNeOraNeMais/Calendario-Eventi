// DELETE /api/admin/votes/:id -> forza l'eliminazione di un singolo voto
export async function onRequestDelete({ params, env }) {
  await env.DB.prepare(`DELETE FROM votes WHERE id = ?`).bind(params.id).run();
  return Response.json({ ok: true });
}
