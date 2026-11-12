#!/usr/bin/env bash
# Idempotent Cloud Agent install for Oshom Proposal Builder.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v psql >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
fi

if ! command -v google-chrome >/dev/null 2>&1 && ! command -v chromium-browser >/dev/null 2>&1 && ! command -v chromium >/dev/null 2>&1; then
  echo "Chrome/Chromium missing; PDF export will need CHROME_PATH set."
fi

npm ci
npx prisma generate
