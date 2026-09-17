const POLL_OPTIONS = ["Sì", "No", "Forse"]; // opzioni standard per tutti i sondaggi

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return new Response("JSON non valido", { status: 400 });

    const { title, description, start_date, end_date, image_key, participants, poll } = body;
    if (!title || !start_date || !end_date) {
      return new Response("Titolo e date sono obbligatori", { status: 400 });
    }

    const id = crypto.randomUUID();
    const slugBase = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const slug = `${slugBase || "evento"}-${id.slice(0, 6)}`;

    await env.DB.prepare(
      `INSERT INTO events (id, slug, title, description, start_date, end_date, image_key)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, slug, title, description || "", start_date, end_date, image_key || null)
      .run();

    if (Array.isArray(participants) && participants.length) {
      const clean = participants.map((n) => n.trim()).filter(Boolean);
      if (clean.length) {
        const stmt = env.DB.prepare(`INSERT INTO participants (event_id, name) VALUES (?, ?)`);
        await env.DB.batch(clean.map((name) => stmt.bind(id, name)));
      }
    }

    const wantsPoll = poll && poll.question && poll.deadline;

    if (wantsPoll) {
      const options = POLL_OPTIONS; // opzioni standard, non modificabili
      const pollId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO polls (id, event_id, question, deadline) VALUES (?, ?, ?, ?)`
      )
        .bind(pollId, id, poll.question, poll.deadline)
        .run();

      const stmt = env.DB.prepare(`INSERT INTO poll_options (poll_id, label) VALUES (?, ?)`);
      await env.DB.batch(options.map((label) => stmt.bind(pollId, label)));
    }

    return Response.json({ ok: true, id, slug });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
