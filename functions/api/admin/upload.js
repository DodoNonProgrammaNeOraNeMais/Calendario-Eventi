// functions/api/admin/upload.js
export async function onRequestPost({ request, env }) {
  if (env.RATE_LIMITER) {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const { success } = await env.RATE_LIMITER.limit({ key: `upload:${ip}` });
    if (!success) {
      return new Response("Troppe richieste, riprova tra un minuto", { status: 429 });
    }
  }

  const formData = await request.formData().catch(() => null);
  const file = formData ? formData.get("image") : null;

  if (!file || typeof file === "string") {
    return new Response("Nessuna immagine ricevuta", { status: 400 });
  }

  if (!file.type || !file.type.startsWith("image/")) {
    return new Response("Il file deve essere un'immagine", { status: 400 });
  }

  if (file.size > 8 * 1024 * 1024) {
    return new Response("Immagine troppo grande (max 8 MB)", { status: 400 });
  }

  // Mappa i tipi MIME consentiti sulle relative estensioni sicure
  const mimeToExt = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif"
  };

  const ext = mimeToExt[file.type] || "jpg";
  const key = `${crypto.randomUUID()}.${ext}`;

  await env.IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return Response.json({ key, url: `/api/images/${key}` });
}
