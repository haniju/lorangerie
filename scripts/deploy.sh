#!/usr/bin/env bash
set -euo pipefail

# ─── Load .env ───────────────────────────────────────────────
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found"
  exit 1
fi

# ─── Validate env vars ──────────────────────────────────────
for var in S3_ACCESS_KEY S3_SECRET_KEY S3_BUCKET S3_ENDPOINT; do
  if [ -z "${!var:-}" ]; then
    echo "Error: $var is not set in .env"
    exit 1
  fi
done

# ─── Build ───────────────────────────────────────────────────
echo "→ Building..."
npm run build

# ─── Deploy ──────────────────────────────────────────────────
echo "→ Deploying to $S3_BUCKET..."

s3cmd sync dist/ "s3://$S3_BUCKET/" \
  --host="$(echo $S3_ENDPOINT | sed 's|https://||')" \
  --host-bucket="%(bucket)s.$(echo $S3_ENDPOINT | sed 's|https://||')" \
  --access_key="$S3_ACCESS_KEY" \
  --secret_key="$S3_SECRET_KEY" \
  --no-mime-magic \
  --no-check-certificate \
  --delete-removed \
  --add-header="Cache-Control:max-age=3600"

echo "✓ Deployed to $S3_ENDPOINT/$S3_BUCKET"
