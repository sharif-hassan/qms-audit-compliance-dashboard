# User Flows

Sequence diagrams for the paths users actually walk through. Each one ties frontend files, backend routes, and database tables together.

## 1. Login

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant UI as Login.jsx
    participant GC as GlobalProvider
    participant API as qms-server
    participant DB as Postgres

    U->>UI: Enter email + password, click Log in
    UI->>GC: login(email, password)
    GC->>API: POST /auth/login { email, password }
    API->>DB: prisma.user.findUnique({ where: { email } })
    DB-->>API: user row with passwordHash
    API->>API: bcrypt.compare(password, passwordHash)
    API->>API: jwt.sign({ userId, role, email }, JWT_SECRET, 1d)
    API-->>GC: { ok, token, user }
    GC->>GC: setAuth, sessionStorage.setItem
    GC->>API: GET /api/clauses/custom (sidebar list)
    UI->>UI: navigate to the page they came from, or "/"
```

Tokens expire after 1 day. When any request comes back `401`, the provider signs the user out and the router sends them to the login page.

## 2. Viewing a standard (ISO 9001 example)

```mermaid
sequenceDiagram
    autonumber
    participant UI as ChecklistPage
    participant GC as GlobalProvider
    participant API as qms-server
    participant DB as Postgres

    UI->>GC: useStandard("iso9001") → loadStandard("iso9001")
    alt not cached yet
        GC->>API: GET /api/clauses/iso9001 + Bearer
        API->>DB: findMany(Clause, { standard: "iso9001" })
        API-->>GC: rows with dbId
        GC->>GC: rowsByStandard.iso9001 = rows
    end
    UI->>API: GET /api/files (useFiles) — evidence links by dbId
    UI-->>UI: groupChecklist(rows, search) → render sections
```

Each standard is fetched the first time a page needs it and then served from the cache.

## 3. Inline editing a clause field

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant IE as InlineEdit
    participant GC as GlobalProvider
    participant API as qms-server
    participant DB as Postgres

    U->>IE: Click cell → type → Save (or Ctrl/⌘+Enter)
    IE->>GC: updateRow("iso9001", row, "cycle", "Quarterly")
    GC->>GC: optimistic update of rowsByStandard
    GC->>API: PATCH /api/clauses/iso9001/4.1%20q1 { field, value } + Bearer
    API->>API: requireAuth + requireRole("ADMIN","USER")
    API->>DB: clause.update(...)
    API->>DB: changeLog.create(CLAUSE_UPDATED, performedBy = user email)
    alt success
        API-->>GC: { success: true }
        GC-->>IE: resolve → editor closes
    else failure
        API-->>GC: 4xx/5xx
        GC->>GC: roll back the cached value
        GC-->>IE: reject → error toast, editor stays open with the draft
    end
```

## 4. Uploading evidence (built-in standard)

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant UI as Evidence.jsx
    participant API as qms-server
    participant FS as uploads/
    participant DB as Postgres

    U->>UI: Pick file(s) + select clause(s) + optional comment per clause
    U->>UI: Click "Upload evidence"

    loop for each file
        UI->>API: POST /api/files<br/>multipart/form-data: file
        API->>FS: multer writes <millis>__<name>
        API->>DB: file.create(...)
        API-->>UI: { id, name, url }

        loop for each selected clause
            UI->>API: POST /api/files/:id/clauses<br/>{ clauseIds: [dbId], comment }
            API->>DB: createMany(FileClause, skipDuplicates)
        end
    end

    UI->>UI: success toast, clear form
```

Clauses are always linked by their database id (`dbId`), for built-in and custom standards alike. Opening the Evidence page from a clause's detail page pre-selects that clause.

## 5. Uploading a custom standard (xlsx)

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant UI as CustomISO.jsx
    participant GC as GlobalProvider
    participant API as qms-server
    participant DB as Postgres

    U->>UI: Drag-drop or browse → pick .xlsx
    UI->>UI: SheetJS → parseStandardRows() → rows[]
    UI->>UI: Editable preview; name pre-filled from the file name
    U->>UI: Click "Save as standard"
    UI->>GC: createCustomStandard(name, rows)
    GC->>API: POST /api/clauses/custom<br/>body: { name, rows } + Bearer (ADMIN or USER)
    API->>API: slug = slugify(name)
    API->>DB: findFirst(Clause, { standard: "custom_" + slug })
    alt already exists
        DB-->>API: row
        API-->>GC: 409 Conflict
        GC-->>UI: throw → "standard already exists"
    else new
        API->>DB: createMany(Clause, rows.map with code: custom_<slug>_<i>)
        API-->>GC: { slug, name }
        GC->>GC: setCustomStandards(prev → [...prev, {slug,name}])
        GC-->>UI: slug
        UI->>UI: navigate("/custom/" + slug)
    end
```

The parsing is entirely in the browser — the server doesn't see an xlsx, only the row array. See [custom-standards.md](custom-standards.md) for how the parser handles messy sheets.

## 6. Files page — attach a clause to a file

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant UI as Files.jsx
    participant API as qms-server
    participant DB as Postgres

    Note over UI: Mount
    UI->>API: GET /api/files (Bearer)
    UI->>API: GET /api/clauses (Bearer)
    UI->>UI: build Fuse search indexes

    U->>UI: Click a file → UI renders its attached clauses
    U->>UI: Search for a clause → click "Attach"
    UI->>API: POST /api/files/:fileId/clauses<br/>body: { clauseIds: [id] } + Bearer
    API->>DB: findMany(Clause, { id: IN }) → createMany(FileClause)
    API-->>UI: { id, clauses: [...] }
    UI->>UI: setFiles(prev … replace that file's clauses)

    U->>UI: Click "Detach" on an attached clause
    UI->>API: DELETE /api/files/:fileId/clauses/:clauseId + Bearer
    API->>DB: prisma.fileClause.delete({ fileId_clauseId })
    API-->>UI: { ok: true }
    UI->>UI: setFiles(prev … filter out that clause)
```

`GET /api/clauses` returns *every* clause across every standard in one payload. The frontend filters to `type === "question"` rows before rendering. This is why custom standards appear automatically in the Files clause picker — they're just more rows in the same table.

## 7. Deleting a file

```mermaid
sequenceDiagram
    participant UI as Files.jsx
    participant API as qms-server
    participant FS as uploads/
    participant DB as Postgres

    UI->>API: DELETE /api/files/:id + Bearer
    API->>DB: findUnique(File)
    API->>DB: delete(File)  → cascades to FileClause
    API->>FS: fs.rm(storagePath) [best-effort]
    API-->>UI: { ok: true }
    UI->>UI: setFiles(prev.filter(f.id !== id))
```

The cascade on `FileClause.fileId` means you don't have to delete the join rows manually — Postgres does it. The disk unlink is best-effort: if it fails, the DB is already clean and the orphan on disk can be garbage-collected by any sweep.

## 8. Role-gated navigation

```mermaid
flowchart TD
    Start[User logs in]
    Check{user.role?}
    Guest[GUEST:<br/>Standards only,<br/>read-only]
    UserR[USER:<br/>Standards + Evidence + Files<br/>+ Add Standard]
    Admin[ADMIN:<br/>Everything +<br/>Users + Change Log]

    Start --> Check
    Check -->|GUEST| Guest
    Check -->|USER| UserR
    Check -->|ADMIN| Admin
```

See [auth.md](auth.md) for where each role is enforced — the sidebar and route guards shape the UI, and the backend middleware enforces the same rules on every request.
