export async function onRequestGet({ env }) {
  try {
    const eventsResult = await env.DB.prepare(
      `SELECT * FROM events ORDER BY start_date DESC`
    ).all();

    const events = eventsResult.results || [];

    return new Response(JSON.stringify(events), {
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
