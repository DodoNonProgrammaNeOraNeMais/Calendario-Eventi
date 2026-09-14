export async function onRequestPost(context) {
  try {
    const { env, request } = context;
    const body = await request.json();

    const title = body.title ?? null;
    const description = body.description ?? null;
    const start_date = body.start_date ?? null;
    const end_date = body.end_date ?? null;
    const image_key = body.image_key ?? null;

    const id = crypto.randomUUID();
    const slug = `${title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'evento'}-${Date.now().toString().slice(-4)}`;

    const result = await env.DB.prepare(
      `INSERT INTO events (id, slug, title, description, image_key, start_date, end_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
    )
      .bind(id, slug, title, description, image_key, start_date, end_date)
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
