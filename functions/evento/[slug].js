// GET /evento/:slug
// Serve la pagina dell'evento con i tag Open Graph compilati con titolo, descrizione
// e immagine dell'evento: e' quello che fa comparire l'anteprima con la foto quando
// il link viene incollato su WhatsApp, Telegram, iMessage, ecc.
// Il contenuto interattivo (dettagli, sondaggio) viene poi caricato da /js/event.js
// chiamando /api/events/:slug.
export async function onRequestGet({ params, env, request }) {
  const event = await env.DB.prepare(`SELECT * FROM events WHERE slug = ?`)
    .bind(params.slug)
    .first();

  if (!event) {
    return new Response("Evento non trovato", { status: 404 });
  }

  const url = new URL(request.url);
  const imageUrl = event.image_key ? `${url.origin}/api/images/${event.image_key}` : null;
  const description = (event.description || "Scopri i dettagli e partecipa.").slice(0, 160);

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(event.title)}</title>
<meta name="description" content="${escapeHtml(description)}">

<meta property="og:title" content="${escapeHtml(event.title)}">
<meta property="og:description" content="${escapeHtml(description)}">
${imageUrl ? `<meta property="og:image" content="${imageUrl}">` : ""}
<meta property="og:type" content="website">
<meta property="og:url" content="${url.origin}/evento/${escapeHtml(event.slug)}">
<meta name="twitter:card" content="summary_large_image">

<link rel="stylesheet" href="/css/style.css">
<script src="/js/theme.js"></script>
</head>
<body>
<div id="app" data-slug="${escapeHtml(params.slug)}"></div>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>
<script src="/js/shared.js"></script>
<script src="/js/event.js" defer></script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
