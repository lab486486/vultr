import { hasAdminAccess } from "./admin-auth.js";

const COUPANG_KEYS_PATH = "config/coupang.json";
const APP_PEPPER = "vultr.coupang.keys.v1";

export { hasAdminAccess };

function bytesToBase64(bytes) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(String(b64 || ""));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function getVaultKey(env) {
  const material = `${APP_PEPPER}:${env.COUPANG_VAULT_KEY || env.GITHUB_CLIENT_SECRET || "r2-at-rest"}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptPayload(env, plain) {
  const key = await getVaultKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(plain));
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    v: 1,
    alg: "AES-GCM",
    iv: bytesToBase64(iv),
    data: bytesToBase64(cipherBuf),
    updatedAt: plain.updatedAt || new Date().toISOString(),
  };
}

async function decryptPayload(env, stored) {
  if (!stored || stored.v !== 1 || !stored.iv || !stored.data) return null;
  try {
    const key = await getVaultKey(env);
    const iv = base64ToBytes(stored.iv);
    const data = base64ToBytes(stored.data);
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    const parsed = JSON.parse(new TextDecoder().decode(plainBuf));
    return {
      accessKey: String(parsed?.accessKey || "").trim(),
      secretKey: String(parsed?.secretKey || "").trim(),
      updatedAt: String(parsed?.updatedAt || stored.updatedAt || ""),
    };
  } catch {
    return null;
  }
}

function readPlaintextKeys(data) {
  const accessKey = String(data?.accessKey || data?.COUPANG_ACCESS_KEY || "").trim();
  const secretKey = String(data?.secretKey || data?.COUPANG_SECRET_KEY || "").trim();
  if (!accessKey || !secretKey) return null;
  return {
    accessKey,
    secretKey,
    updatedAt: String(data?.updatedAt || ""),
  };
}

export async function loadCoupangKeys(env) {
  const fromEnv = {
    accessKey: String(env.COUPANG_ACCESS_KEY || "").trim(),
    secretKey: String(env.COUPANG_SECRET_KEY || "").trim(),
  };

  if (!env.MEDIA_BUCKET) {
    return {
      accessKey: fromEnv.accessKey,
      secretKey: fromEnv.secretKey,
      source: fromEnv.accessKey && fromEnv.secretKey ? "env" : "none",
      updatedAt: "",
      encrypted: false,
    };
  }

  try {
    const obj = await env.MEDIA_BUCKET.get(COUPANG_KEYS_PATH);
    if (obj) {
      const data = await obj.json();
      if (data && data.v === 1 && data.data) {
        const decrypted = await decryptPayload(env, data);
        if (decrypted?.accessKey && decrypted?.secretKey) {
          return {
            accessKey: decrypted.accessKey,
            secretKey: decrypted.secretKey,
            source: "r2",
            updatedAt: decrypted.updatedAt,
            encrypted: true,
          };
        }
      } else {
        const plain = readPlaintextKeys(data);
        if (plain) {
          return {
            accessKey: plain.accessKey,
            secretKey: plain.secretKey,
            source: "r2",
            updatedAt: plain.updatedAt,
            encrypted: false,
          };
        }
      }
    }
  } catch {
    /* fall through */
  }

  return {
    accessKey: fromEnv.accessKey,
    secretKey: fromEnv.secretKey,
    source: fromEnv.accessKey && fromEnv.secretKey ? "env" : "none",
    updatedAt: "",
    encrypted: false,
  };
}

export async function saveCoupangKeys(env, accessKey, secretKey) {
  if (!env.MEDIA_BUCKET) {
    throw new Error("MEDIA_BUCKET binding missing");
  }
  const plain = {
    accessKey: String(accessKey || "").trim(),
    secretKey: String(secretKey || "").trim(),
    updatedAt: new Date().toISOString(),
  };
  const encrypted = await encryptPayload(env, plain);
  await env.MEDIA_BUCKET.put(COUPANG_KEYS_PATH, JSON.stringify(encrypted, null, 2), {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
      cacheControl: "no-store",
    },
  });
  return {
    accessKey: plain.accessKey,
    secretKey: plain.secretKey,
    updatedAt: plain.updatedAt,
    encrypted: true,
  };
}
