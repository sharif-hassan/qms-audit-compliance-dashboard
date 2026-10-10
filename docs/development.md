# Development Guide

How to run the project locally, run tests, and debug common problems.

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 20+ | Vite + Express + Prisma CLI |
| npm | 10+ | Dependency install |
| Docker Desktop | latest | Hosts Postgres |
| Git | — | Source control, and Git Bash on Windows if you want to run `start.sh` |

Confirm with:

```bash
node -v && npm -v && docker --version
```

## First-time setup

```bash
# 1. Install root (frontend) deps
npm install

# 2. Install backend deps
cd qms-server
npm install
cd ..

# 3. Create the backend .env from the example
cp qms-server/.env-example qms-server/.env
```

`DATABASE_URL` must match the credentials in [docker-compose.yml](../docker-compose.yml). Port `5435` is deliberate — it avoids collisions with any Postgres already running on `5432`.

## Starting everything

### Windows

```powershell
.\start.ps1
```

Brings up Docker Postgres, waits for it, runs `prisma migrate deploy` + `prisma db seed`, then opens two new PowerShell windows for the backend (`npm run dev` in `qms-server/`) and frontend (`npm run dev` at the repo root).

**If it says "Is Docker Desktop running?"** — Docker Desktop has to be started first (the whale in your tray must be steady, not animating).

### Mac / Linux

```bash
bash start.sh
```

Same thing, one terminal, backgrounds the dev servers and cleans up on `Ctrl+C`.

### Manually, in two terminals

```bash
# Terminal 1 — backend
cd qms-server
npm run dev                # nodemon src/index.js

# Terminal 2 — frontend
npm run dev                # vite
```

You also need Postgres running — `docker compose up -d db` before either terminal.

## What you should see

```
Frontend:  http://localhost:5173
Backend:   http://localhost:3001  (health check: /health)
Postgres:  localhost:5435          (user qms / password qms_password / db qms_dev)
```

Log in as `admin@example.com / admin123`.

## Running tests

### Frontend (Vitest + Testing Library)

```bash
npm test              # single run
npm run test:watch    # watch mode
npm run test:coverage # HTML coverage report
```

Suites cover the spreadsheet parser, checklist grouping, formatting helpers, the API client, `InlineEdit`, the checklist page, the landing page and the custom-standard upload flow.

### Backend (Jest)

```bash
cd qms-server
npm test
```

Covers every route (auth, clauses, files, users, change log), the auth middleware, role checks and the change-log helper, using Supertest against the Express app with a mocked Prisma client.

### Linting

```bash
npm run lint       # eslint .
```

ESLint is configured via [eslint.config.js](../eslint.config.js) — flat config with React 19 hooks rules for `src/` and Node/CommonJS rules for `qms-server/`. It covers both the frontend and the backend.

## Database management

```bash
cd qms-server

# Create a new migration from schema changes
npx prisma migrate dev --name descriptive_name

# Apply pending migrations (production-style)
npx prisma migrate deploy

# Re-run the seed
npx prisma db seed

# Open a GUI onto the DB
npx prisma studio     # opens http://localhost:5555

# Wipe everything
npx prisma migrate reset
```

### Connecting with psql

```bash
docker exec -it qms_postgres psql -U qms -d qms_dev
```

Useful queries:

```sql
-- Every standard that exists
SELECT DISTINCT standard FROM "Clause";

-- Files attached to a specific clause
SELECT f.name FROM "File" f
JOIN "FileClause" fc ON fc."fileId" = f.id
JOIN "Clause" c ON c.id = fc."clauseId"
WHERE c.code = 'iso9001_4.1';

-- How many custom standards are uploaded
SELECT COUNT(DISTINCT standard) FROM "Clause" WHERE standard LIKE 'custom_%';
```

## Common issues

### "Missing token" on page load

The backend's `requireAuth` rejected a fetch because no JWT was in the header. Causes:

- Not logged in (yet). Log in and retry.
- New code calls `fetch` directly. Use `request()` from `useGlobal()`, which attaches the token.
- Token expired (1 day). The app signs you out automatically; log in again.

### "Expected corresponding JSX closing tag for <>"

A fragment (`<>` / `</>`) isn't balanced. Git merge conflicts around role-gated sidebar sections are the usual cause. Look at the line Babel points to and count openings vs closings.

### Docker: "unable to get image 'postgres:16'"

Docker Desktop isn't running. Start it and wait for the whale to stop animating.

### Frontend can't reach backend

Check:

1. Is the backend running? `curl http://localhost:3001/health` should return `{"ok":true}`.
2. The frontend uses relative URLs (`/api`, `/auth`, `/uploads`) that Vite proxies to `http://localhost:3001` ([vite.config.js](../vite.config.js)). If the backend runs elsewhere, start Vite with `VITE_API_TARGET=http://host:port npm run dev`.
3. If you serve the frontend from a different origin, add it to `CORS_ORIGIN` in `qms-server/.env`.

### xlsx parse produces zero rows

The header row probably wasn't detected. Check the first 12 rows — you need at least two cells in one row that contain keywords like `clause`, `description`, `evaluator`, `responsible`, `type`, etc. If the real header is lower than row 12, extend `findHeaderRow` in [parseStandardWorkbook.js](../src/utils/parseStandardWorkbook.js).

## Project scripts reference

### Root `package.json`

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | Production bundle into `dist/` |
| `npm run preview` | Preview the production bundle |
| `npm run lint` | ESLint for frontend and backend |
| `npm test` | Vitest single run |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Vitest + coverage report |

### `qms-server/package.json`

| Script | What it does |
|---|---|
| `npm run dev` | nodemon on `src/index.js` |
| `npm start` | node `src/index.js` |
| `npm test` | Jest |

## Deployment sketch

The repo doesn't include a deployed environment, but the pieces map cleanly:

- **Frontend** — `npm run build` produces static assets in `dist/`. Serve them from the same origin as the API (e.g. nginx serving `dist/` and proxying `/api`, `/auth` and `/uploads` to the backend), since the app uses relative URLs.
- **Backend** — `node src/index.js` behind a process manager (pm2, systemd) or in a container. Expose on :3001, terminate TLS upstream.
- **Database** — managed Postgres (AWS RDS, Supabase, etc.). Set `DATABASE_URL`, a long random `JWT_SECRET` (the server refuses to start without one), and change the seeded admin password.
- **Uploads** — the current disk-based store works on a single server. For horizontal scaling, swap `multer.diskStorage` for S3 (or equivalent) and update `file.storagePath`/`url` logic.

## Where to add things

| Task | Where |
|---|---|
| New API route | [qms-server/src/routes/](../qms-server/src/routes/) — add a file, require it in [app.js](../qms-server/src/app.js) |
| New clause field | [schema.prisma](../qms-server/prisma/schema.prisma) → migration → update seed + PATCH allowlist |
| New page | [src/pages/](../src/pages/) → add a lazy `<Route>` in [App.jsx](../src/App.jsx) → `<NavItem>` in [AppShell.jsx](../src/components/AppShell.jsx). Build it from the components in [src/components/ui](../src/components/ui) |
| New shared state | [GlobalProvider.jsx](../src/state/GlobalProvider.jsx) — add state and expose it in the provider value |
| New built-in standard | Add it to `BUILT_IN_STANDARDS` in [standards.js](../src/standards.js), add routes for it in qms-server, and seed its clauses |
| New role | See [auth.md](auth.md) "Adding a new role" |
| New standard | No code changes — upload an xlsx via `/custom-upload` |
