#!/usr/bin/env bash
# Boot-time services for Oshom Proposal Builder (Postgres + Next.js dev server).
set -euo pipefail

cd "$(dirname "$0")/.."

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/proposal_builder?schema=public}"
export SESSION_SECRET="${SESSION_SECRET:-dev-session-secret-change-me-please-32chars}"
export ADMIN_EMAIL="${ADMIN_EMAIL:-admin@oshombali.com}"
export ADMIN_NAME="${ADMIN_NAME:-Oshom Admin}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-OshomDevPass123!}"
export CHROME_PATH="${CHROME_PATH:-$(command -v google-chrome || command -v chromium-browser || command -v chromium || true)}"
export CHROME_NO_SANDBOX="${CHROME_NO_SANDBOX:-1}"
export SITE_URL="${SITE_URL:-http://127.0.0.1:36899}"
export PORT="${PORT:-36899}"

# Start PostgreSQL cluster if installed and down.
if command -v pg_lsclusters >/dev/null 2>&1; then
  if ! pg_lsclusters | awk 'NR>1 && $4=="online"{found=1} END{exit !found}'; then
    sudo pg_ctlcluster 16 main start || sudo pg_ctlcluster "$(pg_lsclusters | awk 'NR==2{print $1}')" main start || true
  fi
  # Ensure role/db exist for local agent use when secrets are not injected yet.
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='postgres'" | grep -q 1 || true
  sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" >/dev/null 2>&1 || true
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='proposal_builder'" | grep -q 1 \
    || sudo -u postgres createdb proposal_builder
fi

# Wait for Postgres
for i in $(seq 1 30); do
  if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

npx prisma migrate deploy
npx prisma db seed || true

# Named tmux session for the Next.js app so agents can inspect it.
SESSION_NAME="oshom-proposal-dev"
tmux -f /exec-daemon/tmux.portal.conf has-session -t "=$SESSION_NAME" 2>/dev/null \
  || tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION_NAME" -c "$PWD" -- "${SHELL:-bash}" -l

# Restart the app cleanly in that session.
tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION_NAME:0.0" C-c 2>/dev/null || true
tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION_NAME:0.0" "npm run dev" C-m

# Keep start attached by waiting on the session (boot observability).
exec tmux -f /exec-daemon/tmux.portal.conf wait-for never
