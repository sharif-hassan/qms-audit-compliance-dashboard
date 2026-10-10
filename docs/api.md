# API Reference

The Express server listens on `http://localhost:3001`. In development the frontend reaches it through the Vite proxy, so browser requests use relative paths (`/api/...`).

Every `/api` route requires a JWT: `Authorization: Bearer <token>` from `POST /auth/login`. The token carries `{ userId, role, email }` and expires after one day. Roles are enforced per route — see [auth.md](auth.md).

| Role shorthand | Meaning |
|---|---|
| **Any** | ADMIN, USER or GUEST |
| **Editors** | ADMIN or USER |
| **Admins** | ADMIN only |

Errors are JSON: clause and file routes return `{ "error": "..." }`, auth and user routes `{ "ok": false, "message": "..." }`. Common statuses: `400` invalid input, `401` missing/invalid token, `403` wrong role, `404` not found, `409` conflict.

Every change made through the API is recorded in the change log with the email of the user who made it.

---

## Auth

### `POST /auth/login` — public

```json
{ "email": "admin@example.com", "password": "admin123" }
```

→ `200 { "ok": true, "token": "eyJ…", "user": { "id": 1, "name": "Admin", "email": "admin@example.com", "role": "ADMIN" } }`

`400` if a field is missing, `401` on bad credentials.

---

## Clauses

### `GET /api/clauses` — Any

Every clause in every standard, raw database rows. Used by the Files page clause picker.

### `POST /api/clauses` — Admins

Upsert one clause by `code`: `{ "code": "iso9001_4.1 q9", "title": "..." }`.

### ISO 9001 and ISO 42001

Identical contracts; replace `iso9001` with `iso42001`.

#### `GET /api/clauses/iso9001` — Any

```json
[{ "dbId": 12, "clause": "4.1 q1", "type": "question", "isoClause": "...", "auditQuestion": "...",
   "std": "9001, 27001", "cycle": "Annual", "responsibleParty": "...", "evaluatorNotes": "...",
   "evidence": [{ "comment": "...", "files": [{ "name": "policy.pdf", "url": "/uploads/..." }] }] }]
```

`type` is `section`, `subsection` or `question`, in document order.

#### `PATCH /api/clauses/iso9001/:clause` — Editors

`:clause` is the clause number (`4.1 q1`, URL-encoded). Body `{ "field": "...", "value": "..." }`. Allowed fields: `isoClause`, `auditQuestion`, `std`, `cycle`, `responsibleParty`, `evaluatorNotes`, `evidence` (stored as JSON). `404` if the clause doesn't exist.

#### `DELETE /api/clauses/iso9001/:clause` — Admins

Removes the clause and (by cascade) its file links.

### ISO 27001

#### `GET /api/clauses/iso27001` — Any

```json
[{ "dbId": 200, "id": "Annex A 5.1", "category": "Organizational", "title": "...", "description": "...",
   "reference": "AC-1, AC-2", "evaluatorNotes": "...", "responsible": "...", "evidence": [] }]
```

#### `PATCH /api/clauses/iso27001/:id` — Editors

`:id` is the control id (`Annex A 5.1`). Allowed fields: `category`, `title`, `description`, `reference`, `evaluatorNotes`, `responsible`, `evidence`.

#### `DELETE /api/clauses/iso27001/:id` — Admins

### Custom standards

#### `GET /api/clauses/custom` — Any

`[{ "slug": "nist_csf", "name": "NIST CSF" }]`

#### `POST /api/clauses/custom` — Editors

```json
{
  "name": "NIST CSF",
  "rows": [
    { "type": "section", "clause": "ID", "isoClause": "IDENTIFY" },
    { "type": "question", "clause": "ID.AM-1", "isoClause": "Asset Inventory",
      "auditQuestion": "...", "std": "NIST CSF", "cycle": "Annual",
      "responsibleParty": "IT Director", "evaluatorNotes": "..." }
  ]
}
```

The slug is derived from the name (`"NIST CSF"` → `nist_csf`). → `201 { "slug", "name" }`, or `409` if that slug exists.

#### `GET /api/clauses/custom/:slug` — Any

Same row shape as ISO 9001.

#### `PATCH /api/clauses/custom/:slug/:dbId` — Editors

Same fields as ISO 9001. The row must belong to `:slug`, otherwise `404`.

#### `DELETE /api/clauses/custom/:slug/:dbId` — Admins

#### `DELETE /api/clauses/custom/:slug` — Admins

Deletes the whole standard. → `{ "ok": true, "deleted": <count> }`.

---

## Files

### `GET /api/files` — Any

```json
[{ "id": 1, "name": "policy.pdf", "url": "/uploads/1712345678901__policy.pdf",
   "mimeType": "application/pdf", "sizeBytes": 24567, "uploadedAt": "2026-04-19T…",
   "clauses": [{ "id": 12, "code": "iso9001_4.1 q1", "standard": "iso9001", "title": null,
                 "isoClause": "...", "auditQuestion": "...", "comment": "Signed copy" }] }]
```

`clauses[].id` is the clause `dbId`; `comment` is the note on that specific file ↔ clause link.

### `POST /api/files` — Editors

`multipart/form-data` with a `file` field (50 MB max). → `201 { id, name, url, uploadedAt }`.

### `DELETE /api/files/:id` — Editors

Deletes the file, its links and the stored upload.

### `POST /api/files/:id/clauses` — Editors

Link a file to clauses. Body: `{ "clauseIds": [12, 47], "comment": "optional" }` (or `clauseCodes` instead of `clauseIds`). Duplicate links are ignored.

### `PATCH /api/files/:id/clauses/:clauseId` — Editors

Update the link comment: `{ "comment": "..." }`.

### `DELETE /api/files/:id/clauses/:clauseId` — Editors

Unlink a file from one clause; the file itself is kept.

### `GET /uploads/<filename>`

Static file serving. Not authenticated: anyone with the URL can download the file (see [auth.md](auth.md)).

---

## Users — all Admins

| Route | Notes |
|---|---|
| `GET /api/users` | `{ ok, users: [{ id, name, email, role, createdAt }] }` |
| `POST /api/users` | `{ name, email, password, role }`; `role` is `ADMIN`, `USER` or `GUEST` |
| `PATCH /api/users/:id` | Any subset of the fields; blank `password` keeps the current one |
| `DELETE /api/users/:id` | |

Admins can't delete their own account or remove their own admin role (`400`). Duplicate emails return `400 Email already exists`.

---

## Change log

### `GET /api/changelog` — Admins

The 500 most recent entries, newest first: `[{ id, action, description, performedBy, createdAt }]`.

Entries are only written by the server. Actions: `CLAUSE_UPDATED`, `CLAUSE_DELETED`, `STANDARD_CREATED`, `STANDARD_DELETED`, `FILE_UPLOADED`, `FILE_DELETED`, `CLAUSE_ATTACHED`, `CLAUSE_DETACHED`, `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`.

---

## `GET /health` — public

`{ "ok": true }`
