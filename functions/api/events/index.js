// GET /api/events?from=YYYY-MM-DD&to=YYYY-MM-DD
// Elenco pubblico degli eventi, opzionalmente filtrato per intervallo di date.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = `SELECT id, slug, title, description, image_key, start_date, end_date FROM events`;
  const params = [];

  if (from && to) {
    // include ogni evento che si sovrappone all'intervallo richiesto
    query += ` WHERE start_date <= ? AND end_date >= ?`;
    params.push(to, from);
  }
  query += ` ORDER BY start_date ASC`;

  const { results } = await env.DB.prepare(query).bind(...params).all();

  const events = results.map((e) => ({
    ...e,
    image_url: e.image_key ? `/api/images/${e.image_key}` : null,
  }));

  return Response.json(events);
}
