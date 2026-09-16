// functions/api/admin/votes/[id].js
// DELETE /api/admin/votes/:id -> Rifiuta / elimina un voto da parte dell'admin
export async function onRequestDelete({ params, env }) {
  const voteId = params.id;
  try {
    await env.DB.prepare("DELETE FROM votes WHERE id = ?").bind(voteId).run();
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// Se viene usata una PUT per rifiutare/eliminare il voto
export async function onRequestPut({ params, env }) {
  const voteId = params.id;
  try {
    await env.DB.prepare("DELETE FROM votes WHERE id = ?").bind(voteId).run();
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
