/**
 * Admin access = GitHub token that can read this repo (same as Decap login).
 */
const GITHUB_REPO = "lab486486/vultr";

export function getBearerToken(request) {
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export async function hasAdminAccess(request) {
  const token = getBearerToken(request);
  if (!token) return false;

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "vultr-admin",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
