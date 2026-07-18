#!/usr/bin/env bash
# Upload public/images to R2
#
# Usage:
#   BUCKET=vultr-media ./scripts/upload-r2.sh

set -euo pipefail

BUCKET="${BUCKET:-vultr-media}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE_CONTROL="public, max-age=31536000, immutable"

echo "Uploading images to R2 bucket: $BUCKET"

upload() {
  local key="$1"
  local file="$2"
  local ct="$3"
  echo "→ $key ($ct)"
  npx wrangler r2 object put "$BUCKET/$key" --file "$file" \
    --remote \
    --content-type "$ct" \
    --cache-control "$CACHE_CONTROL"
}

content_type() {
  case "$1" in
    *.webp) echo "image/webp" ;;
    *.jpg|*.jpeg) echo "image/jpeg" ;;
    *.png) echo "image/png" ;;
    *.gif) echo "image/gif" ;;
    *.svg) echo "image/svg+xml" ;;
    *) echo "application/octet-stream" ;;
  esac
}

if [[ -d "$ROOT/public/images" ]]; then
  while IFS= read -r -d '' f; do
    rel="${f#"$ROOT/public/"}"
    name="$(basename "$f")"
    [[ "$name" == ".gitkeep" ]] && continue
    upload "$rel" "$f" "$(content_type "$name")"
  done < <(find "$ROOT/public/images" -type f -print0)
fi

echo
echo "Done. Cache-Control: $CACHE_CONTROL"
echo "Set R2_PUBLIC_BASE_URL in wrangler.toml and public/admin/config.yml"
