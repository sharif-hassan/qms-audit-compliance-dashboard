# QMS Compliance — Documentation

A compliance/Quality Management System for managing ISO 9001, ISO 27001, ISO 42001, and any custom standard uploaded as a spreadsheet. Users upload audit spreadsheets, attach evidence files to clauses, and export filled-in audit packages.

---

## Table of contents

| Doc | What's in it |
|---|---|
| [architecture.md](architecture.md) | High-level system diagram, tech stack, how the pieces fit together |
| [data-model.md](data-model.md) | Prisma schema, ER diagram, how clauses/files/users are stored |
| [api.md](api.md) | Every backend HTTP route, its auth requirements, request/response shapes |
| [frontend.md](frontend.md) | Routing, state, the shared component library and design system |
| [flows.md](flows.md) | Sequence diagrams for login, evidence upload, custom-standard upload |
| [auth.md](auth.md) | JWT flow, role-based access control, where auth is enforced |
| [custom-standards.md](custom-standards.md) | How customer-specific standards are parsed, stored, and rendered |
| [development.md](development.md) | Local dev setup, running tests, deploying, and common gotchas |

## Quick orientation

- **Frontend**: React 19 + Vite at the repo root ([src/](../src/))
- **Backend**: Express + Prisma at [qms-server/](../qms-server/)
- **Database**: PostgreSQL 16 (Dockerized, see [docker-compose.yml](../docker-compose.yml))
- **Start everything**: `.\start.ps1` (Windows) or `bash start.sh` (Mac/Linux) — brings up DB, runs migrations + seed, starts backend and frontend

Default admin seeded on first run: `admin@example.com` / `admin123`.

Services after startup:

- Frontend → http://localhost:5173
- Backend  → http://localhost:3001
- DB       → localhost:5435 (Postgres inside the `qms_postgres` container)

## Feature summary

1. **Three built-in standards** — ISO 9001, ISO 27001, ISO 42001. Each has a page where auditors edit clause fields inline, record evaluator notes, attach evidence and export to Excel.
2. **Custom standards** — Upload any audit spreadsheet (.xlsx) through the *Add Standard* page. The parser detects the header row, maps columns, and saves the rows as first-class clauses that behave like ISO clauses everywhere (Evidence tabs, Files page, sidebar).
3. **Evidence uploads** — Files are attached to one or many clauses in one action from [Evidence.jsx](../src/pages/Evidence.jsx).
4. **File ↔ clause linking** — The Files page shows every uploaded file and lets you attach or detach clauses.
5. **Users & roles** — ADMIN / USER / GUEST, enforced both at the route level (sidebar) and by Express middleware on the backend.
6. **Change log** — Admin-visible audit trail of every edit, upload and account change, with who made it.

## Repo layout (short version)

```
qms-audit-compliance-dashboard/
├── docs/                 # This folder — documentation + sample upload files
├── src/                  # React frontend
│   ├── pages/            # Route components (one per screen)
│   ├── components/       # Shared components (ui/ = design-system primitives)
│   ├── state/            # GlobalProvider (auth + clause cache), toasts
│   ├── hooks/            # useStandard, useFiles
│   ├── utils/            # Formatting, Excel import/export
│   └── styles.css        # Design tokens + component styles
├── qms-server/           # Node/Express backend
│   ├── src/
│   │   ├── routes/       # auth / clauses / files / users / changelog
│   │   ├── middleware/   # requireAuth, requireRole
│   │   └── app.js        # Express app assembly
│   └── prisma/           # schema.prisma, migrations, seed.js, data/ (ISO catalogs)
├── docker-compose.yml    # Postgres service
├── start.ps1             # Windows one-command startup
└── start.sh              # Unix one-command startup
```

For the deep tour, start at [architecture.md](architecture.md).
