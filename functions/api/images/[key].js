// GET /api/images/:key
// Serve un'immagine salvata su R2 con cache lunga (le chiavi sono univoche e immutabili).
export async function onRequestGet({ params, env }) {
  const object = await env.IMAGES.get(params.key);
  if (!object) {
    return new Response("Immagine non trovata", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
}
