// POST /api/admin/events
// Crea un evento. Protetto da Cloudflare Access (vedi README, applicazione su /admin*).
export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body) return new Response("JSON non valido", { status: 400 });

  const { title, description, startDate, endDate, imageKey, participants, poll } = body;

  if (!title || !startDate || !endDate) {
    return new Response("Titolo e date sono obbligatori", { status: 400 });
  }
  if (endDate < startDate) {
    return new Response("La data di fine non puo' essere prima dell'inizio", { status: 400 });
  }

  const id = crypto.randomUUID();
  const slug = await makeUniqueSlug(env, title);

  await env.DB.prepare(
    `INSERT INTO events (id, slug, title, description, image_key, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, slug, title, description || "", imageKey || null, startDate, endDate)
    .run();

  if (Array.isArray(participants) && participants.length) {
    const stmt = env.DB.prepare(`INSERT INTO participants (event_id, name) VALUES (?, ?)`);
    const clean = participants.map((n) => n.trim()).filter(Boolean);
    if (clean.length) await env.DB.batch(clean.map((name) => stmt.bind(id, name)));
  }

  if (poll && poll.question && poll.deadline && Array.isArray(poll.options)) {
    const options = poll.options.map((o) => o.trim()).filter(Boolean);
    if (options.length >= 2) {
      const pollId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO polls (id, event_id, question, deadline) VALUES (?, ?, ?, ?)`
      )
        .bind(pollId, id, poll.question, poll.deadline)
        .run();
      const stmt = env.DB.prepare(`INSERT INTO poll_options (poll_id, label) VALUES (?, ?)`);
      await env.DB.batch(options.map((label) => stmt.bind(pollId, label)));
    }
  }

  return Response.json({ ok: true, id, slug });
}

async function makeUniqueSlug(env, title) {
  const base =
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // rimuove gli accenti
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "evento";

  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await env.DB.prepare(`SELECT 1 FROM events WHERE slug = ?`).bind(slug).first()) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}
