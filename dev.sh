#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "\n=== LMI Dev Orchestrator ==="
echo "Root: $ROOT_DIR"

# --- 1. Start infra services (db, redis) via docker compose ---
echo "[infra] Ensuring Postgres + Redis are up (docker compose)..."
docker compose up -d db redis >/dev/null 2>&1 || docker-compose up -d db redis

echo "[infra] Active containers:"
docker compose ps --services --status running 2>/dev/null || docker-compose ps --services

# --- 2. Export default env vars for local backend if not already set ---
: "${DATABASE_URL:=postgresql://user:password@localhost:5433/mydb}"
: "${REDIS_URL:=redis://localhost:6379}"

export DATABASE_URL REDIS_URL

echo "[env] DATABASE_URL=$DATABASE_URL"
echo "[env] REDIS_URL=$REDIS_URL"

# --- 3. Graceful shutdown handler ---
cleanup() {
	echo "\n[cleanup] Stopping frontend/backend..."
	# shellcheck disable=SC2086
	kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
	wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
	echo "[cleanup] Done."
}
trap cleanup INT TERM EXIT

# --- (optional) Wait for Postgres readiness so prisma doesn't error ---
wait_for_postgres() {
	echo "[infra] Waiting for Postgres to become ready (localhost:5433)..."
	local retries=45
	local delay=1
	for i in $(seq 1 $retries); do
		# Try docker exec pg_isready if available
		if (docker compose exec -T db pg_isready -U user >/dev/null 2>&1) || \
			 (docker-compose exec -T db pg_isready -U user >/dev/null 2>&1); then
			echo "[infra] Postgres ready (via pg_isready)."; return 0
		fi
		# Fallback: simple TCP check
		if (command -v nc >/dev/null 2>&1 && nc -z localhost 5433 >/dev/null 2>&1); then
			echo "[infra] Postgres TCP port open."; return 0
		fi
		sleep $delay
	done
	echo "[infra] Proceeding even though Postgres readiness not confirmed." >&2
}

wait_for_postgres

# --- 4. Start backend (local, fast) ---
echo "[backend] Starting in $ROOT_DIR/backend (npm run dev)..."
(
	cd "$ROOT_DIR/backend"
	# Forward env explicitly (already exported) and run
	npm run dev
) &
BACKEND_PID=$!

# --- 5. Start frontend ---
echo "[frontend] Starting in $ROOT_DIR/frontend (npm run dev)..."
(
	cd "$ROOT_DIR/frontend"
	npm run dev
) &
FRONTEND_PID=$!

echo "\n[info] Frontend PID: $FRONTEND_PID | Backend PID: $BACKEND_PID"
echo "[info] Press Ctrl+C to stop all."

# --- 6. Wait on both ---
wait $BACKEND_PID $FRONTEND_PID

exit 0
