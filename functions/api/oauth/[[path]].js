/**
 * Decap CMS GitHub OAuth — Cloudflare Pages Functions
 * Same-origin as CMS so postMessage handshake works reliably.
 *
 * Routes:
 *   GET /api/oauth/auth     → GitHub authorize
 *   GET /api/oauth/callback → token exchange + Decap handshake
 *
 * Pages secrets:
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 */

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN = "https://github.com/login/oauth/access_token";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/oauth\/?/, "");

  if (path === "auth" || path === "auth/") {
    return handleAuth(request, env, url.origin);
  }

  if (path === "callback" || path === "callback/") {
    return handleCallback(request, env, url.origin);
  }

  return new Response("Decap CMS OAuth", { status: 200 });
}

async function handleAuth(request, env, origin) {
  const params = new URL(request.url).searchParams;
  const provider = params.get("provider");
  const scope = params.get("scope") || "repo,user";

  if (provider !== "github") {
    return new Response("Unsupported provider", { status: 400 });
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response("GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET not set in Pages env", {
      status: 500,
    });
  }

  const redirectUri = `${origin}/api/oauth/callback`;
  const state = await createSignedState(env.GITHUB_CLIENT_SECRET);

  const authUrl = new URL(GITHUB_AUTHORIZE);
  authUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);

  return Response.redirect(authUrl.toString(), 302);
}

async function handleCallback(request, env, origin) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return htmlResponse(errorPage(`GitHub OAuth 거부: ${error}`), 400);
  }

  if (!code || !state) {
    return htmlResponse(errorPage("code 또는 state 파라미터가 없습니다."), 400);
  }

  if (!(await verifySignedState(state, env.GITHUB_CLIENT_SECRET))) {
    return htmlResponse(
      errorPage("OAuth state 검증 실패. CMS에서 다시 Login with GitHub를 눌러주세요."),
      400,
    );
  }

  const redirectUri = `${origin}/api/oauth/callback`;

  const tokenResponse = await fetch(GITHUB_TOKEN, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.error || !tokenData.access_token) {
    return htmlResponse(
      errorPage(
        `토큰 발급 실패: ${tokenData.error_description || tokenData.error || "unknown"}`,
      ),
      400,
    );
  }

  return htmlResponse(
    successPage({
      token: tokenData.access_token,
      provider: "github",
    }),
  );
}

function successPage(content) {
  const contentJson = JSON.stringify(content);
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>Authorizing...</title></head>
<body>
<p>로그인 완료. 잠시만 기다려주세요...</p>
<script>
(function () {
  var content = ${contentJson};
  var sent = false;

  function sendToken(targetOrigin) {
    if (sent || !window.opener) return;
    sent = true;
    window.opener.postMessage(
      "authorization:github:success:" + JSON.stringify(content),
      targetOrigin
    );
    window.close();
  }

  function receiveMessage(e) {
    if (sent) return;
    if (e.data !== "authorizing:github") return;
    sendToken(e.origin);
  }

  window.addEventListener("message", receiveMessage, false);

  function ping() {
    if (sent || !window.opener) return;
    window.opener.postMessage("authorizing:github", "*");
  }

  if (window.opener) {
    ping();
    setTimeout(ping, 300);
    setTimeout(ping, 1000);
    setTimeout(function () {
      if (!sent) {
        document.body.innerHTML =
          "<h1>CMS 연결 대기 중...</h1><p>팝업을 닫지 말고 잠시만 기다려주세요.</p>";
      }
    }, 2000);
  } else {
    document.body.innerHTML =
      "<h1>팝업 연결 실패</h1><p>브라우저가 팝업 연결을 차단했습니다.</p>" +
      "<p>팝업 차단을 해제하고 CMS에서 다시 Login with GitHub를 눌러주세요.</p>";
  }
})();
</script>
</body></html>`;
}

function errorPage(message) {
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><title>OAuth Error</title></head>
<body style="font-family:sans-serif;padding:2rem;max-width:480px">
  <h1>로그인 실패</h1>
  <p>${escapeHtml(message)}</p>
  <p>이 창을 닫고 CMS에서 다시 시도해주세요.</p>
</body></html>`;
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function createSignedState(secret) {
  const nonce = crypto.randomUUID();
  const issuedAt = Date.now();
  const payload = `${nonce}:${issuedAt}`;
  const signature = await hmacSha256Hex(secret, payload);
  return `${payload}:${signature}`;
}

async function verifySignedState(state, secret) {
  const parts = state.split(":");
  if (parts.length !== 3) return false;

  const [nonce, issuedAt, signature] = parts;
  if (!nonce || !issuedAt || !signature) return false;

  const age = Date.now() - Number(issuedAt);
  if (Number.isNaN(age) || age < 0 || age > 10 * 60 * 1000) return false;

  const payload = `${nonce}:${issuedAt}`;
  const expected = await hmacSha256Hex(secret, payload);
  return timingSafeEqual(signature, expected);
}

async function hmacSha256Hex(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
