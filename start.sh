#!/bin/bash

echo "🗄️  Starting PostgreSQL..."
docker compose up -d db

echo "⏳ Waiting for database..."
until docker exec qms_postgres pg_isready -U qms >/dev/null 2>&1; do
  echo "   Database not ready yet..."
  sleep 2
done

echo "✅ Database ready!"
echo ""

echo "🔧 Running migrations & seed..."
cd qms-server
npx prisma generate    
npx prisma migrate deploy
npx prisma db seed

echo ""
echo "🚀 Starting backend..."
npm run dev &
BACKEND_PID=$!

echo ""
echo "🎨 Starting frontend..."
cd ..
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo "✅ All services running!"
echo "🗄️  Database:  localhost:5435"
echo "🔧 Backend:   http://localhost:3001"
echo "🎨 Frontend:  http://localhost:5173"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; docker compose down; exit" INT
wait