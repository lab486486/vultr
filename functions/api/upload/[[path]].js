/**
 * Optional R2 upload endpoint for landing images / future CMS.
 * PUT /api/upload/images/about.webp
 *
 * Pages bindings:
 * - MEDIA_BUCKET → R2 bucket
 * Env:
 * - R2_PUBLIC_BASE_URL=https://pub-....r2.dev
 */

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
]);

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.pathname.replace(/^\/api\/upload\//, "");

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method !== "PUT") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!key || key.includes("..")) {
    return new Response("Invalid key", { status: 400 });
  }

  if (!env.MEDIA_BUCKET) {
    return new Response(
      "MEDIA_BUCKET binding not configured. Pages → Settings → Bindings → R2",
      { status: 500 },
    );
  }

  const contentType = request.headers.get("Content-Type") || "application/octet-stream";

  if (!ALLOWED_TYPES.has(contentType)) {
    return new Response(`Unsupported file type: ${contentType}`, { status: 415 });
  }

  await env.MEDIA_BUCKET.put(key, request.body, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  const publicBase = (env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  const publicUrl = `${publicBase}/${key}`;

  return Response.json({ url: publicUrl, key });
}
