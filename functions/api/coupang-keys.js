/**
 * Coupang Partners API keys admin API
 * GET  /api/coupang-keys
 * PUT  /api/coupang-keys  JSON { accessKey, secretKey }
 *
 * Stored in R2 (config/coupang.json). Falls back to Pages env secrets if empty.
 */

import { hasAdminAccess, loadCoupangKeys, saveCoupangKeys } from "../lib/coupang-keys.js";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (!(await hasAdminAccess(request))) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  if (request.method === "GET") {
    const keys = await loadCoupangKeys(env);
    return json({
      ok: true,
      accessKey: keys.accessKey,
      secretKey: keys.secretKey,
      source: keys.source,
      updatedAt: keys.updatedAt,
      encrypted: Boolean(keys.encrypted),
      configured: Boolean(keys.accessKey && keys.secretKey),
    });
  }

  if (request.method !== "PUT" && request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const accessKey = String(body.accessKey || body.COUPANG_ACCESS_KEY || "").trim();
  const secretKey = String(body.secretKey || body.COUPANG_SECRET_KEY || "").trim();

  if (!accessKey || !secretKey) {
    return json({ ok: false, error: "both_keys_required" }, 400);
  }

  try {
    const saved = await saveCoupangKeys(env, accessKey, secretKey);
    return json({
      ok: true,
      accessKey: saved.accessKey,
      secretKey: saved.secretKey,
      source: "r2",
      updatedAt: saved.updatedAt,
      encrypted: Boolean(saved.encrypted),
      configured: true,
    });
  } catch (error) {
    return json({ ok: false, error: error.message || "save_failed" }, 500);
  }
}
