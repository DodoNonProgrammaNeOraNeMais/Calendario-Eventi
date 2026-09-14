// POST /api/admin/upload  (multipart/form-data, campo "image")
// Carica un'immagine su R2 e restituisce la chiave da salvare sull'evento.
// Protetto da Cloudflare Access (vedi README, applicazione su /admin*).
export async function onRequestPost({ request, env }) {
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

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = `${crypto.randomUUID()}.${ext || "jpg"}`;

  await env.IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return Response.json({ key, url: `/api/images/${key}` });
}
