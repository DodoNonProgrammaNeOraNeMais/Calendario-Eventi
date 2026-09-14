export async function onRequestPost(context) {
  try {
    const { env, request } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: "Manca il binding DB in env!" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { title, description, start_date, end_date, image_url } = body;

    const result = await env.DB.prepare(
      `INSERT INTO Events (title, description, start_date, end_date, image_url) 
       VALUES (?, ?, ?, ?, ?) RETURNING id`
    )
      .bind(title, description, start_date, end_date, image_url)
      .first();

    return new Response(JSON.stringify({ success: true, event: result }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
