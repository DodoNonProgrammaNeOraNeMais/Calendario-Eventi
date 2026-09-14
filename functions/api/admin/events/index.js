export async function onRequestPost(context) {
  try {
    const { env, request } = context;
    const body = await request.json();

    const title = body.title ?? null;
    const description = body.description ?? null;
    const start_date = body.start_date ?? null;
    const end_date = body.end_date ?? null;
    const image_url = body.image_url ?? null;

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
