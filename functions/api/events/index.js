// functions/api/events/index.js
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    let query = `SELECT * FROM events`;
    const params = [];

    // Se sono specificati i filtri data, filtriamo gli eventi sovrapposti all'intervallo
    if (from && to) {
      query += ` WHERE end_date >= ? AND start_date <= ?`;
      params.push(from, to);
    }

       query += ` ORDER BY start_date ASC`;

    const stmt = env.DB.prepare(query);
    const eventsResult = params.length ? await stmt.bind(...params).all() : await stmt.all();
    const events = (eventsResult.results || []).map((e) => ({
      ...e,
      image_url: e.image_key ? `/api/images/${e.image_key}` : null,
    }));

    return new Response(JSON.stringify(events), {
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    });
  } catch (err) {
    console.error("GET /api/events failed:", err);
    return Response.json({ error: "Errore interno, riprova." }, { status: 500 });
  }
}
