#!/usr/bin/env bash
# Starts the database, prepares it, and runs the backend and frontend.
# Usage: ./start.sh   (stop everything with Ctrl+C)

cd "$(dirname "$0")" || exit 1

fail() {
  echo "❌ $1"
  exit 1
}

# ── Prerequisites ───────────────────────────────────────────────────────
command -v node >/dev/null 2>&1 || fail "Node.js is not installed. Install Node 20.19+ or 22.12+ from https://nodejs.org"
# Vite 7 needs Node ^20.19 or >=22.12.
node -e '
  const [major, minor] = process.versions.node.split(".").map(Number);
  const ok = (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22;
  process.exit(ok ? 0 : 1);
' || fail "Node $(node -v) is too old. This project needs Node 20.19+ or 22.12+."

command -v docker >/dev/null 2>&1 || fail "Docker is not installed. Install Docker Desktop from https://www.docker.com/products/docker-desktop/"
docker info >/dev/null 2>&1 || fail "Docker is installed but not running. Start Docker Desktop and try again."

if [ ! -f qms-server/.env ]; then
  cp qms-server/.env-example qms-server/.env
  echo "📝 Created qms-server/.env from .env-example"
fi

[ -d node_modules ] || { echo "📦 Installing frontend dependencies..."; npm install --no-audit --no-fund || fail "npm install failed"; }
[ -d qms-server/node_modules ] || { echo "📦 Installing backend dependencies..."; (cd qms-server && npm install --no-audit --no-fund) || fail "npm install failed in qms-server"; }

# ── Database ────────────────────────────────────────────────────────────
echo "🗄️  Starting PostgreSQL..."
docker compose up -d db || fail "Could not start the database container."

echo "⏳ Waiting for database..."
for _ in $(seq 1 30); do
  docker exec qms_postgres pg_isready -U qms >/dev/null 2>&1 && break
  sleep 2
done
docker exec qms_postgres pg_isready -U qms >/dev/null 2>&1 || fail "Database did not become ready within 60 seconds. Check: docker compose logs db"
echo "✅ Database ready!"
echo ""

echo "🔧 Running migrations & seed..."
(
  cd qms-server &&
  npx prisma generate &&
  npx prisma migrate deploy &&
  npx prisma db seed
) || fail "Database setup failed (see the errors above)."

# ── Servers ─────────────────────────────────────────────────────────────
echo ""
echo "🚀 Starting backend..."
(cd qms-server && npm run dev) &
BACKEND_PID=$!

echo "🎨 Starting frontend..."
npm run dev &
FRONTEND_PID=$!

cleanup() {
  echo ""
  echo "Stopping..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  docker compose stop db >/dev/null
  exit 0
}
trap cleanup INT TERM

echo ""
echo "=========================================="
echo "✅ All services running!"
echo "🎨 App:      http://localhost:5173"
echo "   Login:    admin@example.com / admin123"
echo "🔧 API:      http://localhost:3001"
echo "🗄️  Database: localhost:5435"
echo "=========================================="
echo "Press Ctrl+C to stop all services."

wait
