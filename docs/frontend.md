# Frontend Guide

React 19 single-page app built with Vite. Every page is composed from a small set of shared components and styled by one stylesheet, so new screens look and behave like the existing ones by default.

## Layout of `src/`

```
src/
├── main.jsx              # Mounts <App />, imports styles.css
├── App.jsx               # Providers + route table (pages are lazy-loaded)
├── styles.css            # Design tokens and every component class
├── api.js                # apiFetch(): the only place that calls fetch()
├── standards.js          # Registry of standards + endpoint/label helpers
├── permissions.js        # canEdit / canDelete / isAdmin, role labels
├── state/
│   ├── context.js        # GlobalContext, ToastContext, useGlobal(), useToast()
│   ├── GlobalProvider.jsx# Auth + cached clause rows per standard
│   └── ToastProvider.jsx # Success/error notifications
├── hooks/
│   ├── useStandard.js    # Load one standard; save/delete rows with error toasts
│   └── useFiles.js       # Evidence files + linking operations
├── components/
│   ├── AppShell.jsx      # Sidebar layout around every page except Landing/Login
│   ├── ProtectedRoute.jsx
│   ├── ChecklistTable.jsx# Section → subsection → question table
│   ├── EvidenceCell.jsx  # Evaluator notes + linked files with comments
│   └── ui/               # Icon, Button, Panel, PageHeader, InlineEdit, Tag, …
├── pages/                # One component per route
└── utils/                # format, checklist grouping, Excel export, xlsx parser
```

## Routes

Defined in [App.jsx](../src/App.jsx). Everything except `/login` requires a signed-in user; deep links are preserved through login.

| Path | Page | Who |
|---|---|---|
| `/login` | [Login](../src/pages/Login.jsx) | Public |
| `/` | [Landing](../src/pages/Landing.jsx) | Any role |
| `/iso9001`, `/iso42001` | [ChecklistPage](../src/pages/ChecklistPage.jsx) | Any role (read-only for GUEST) |
| `/iso27001` | [ISO27001](../src/pages/ISO27001.jsx) | Any role |
| `/custom/:slug` | [CustomStandardPage](../src/pages/CustomStandardPage.jsx) → ChecklistPage | Any role |
| `/<standard>/clause/:dbId` | [ClauseDetail](../src/pages/ClauseDetail.jsx) | Any role |
| `/custom-upload` | [CustomISO](../src/pages/CustomISO.jsx) | ADMIN, USER |
| `/evidence` | [Evidence](../src/pages/Evidence.jsx) | ADMIN, USER |
| `/files` | [Files](../src/pages/Files.jsx) | ADMIN, USER |
| `/users` | [Users](../src/pages/Users.jsx) | ADMIN |
| `/changelog` | [ChangeLog](../src/pages/ChangeLog.jsx) | ADMIN |

Route guards only shape the UI; the backend enforces the same rules (see [auth.md](auth.md)).

## Standards are data

[standards.js](../src/standards.js) describes each standard once:

```js
{ id: "iso9001", name: "ISO 9001", title: "ISO 9001:2015", layout: "checklist",
  path: "/iso9001", eyebrow: "Quality Management System", ... }
```

Custom standards get the id `custom:<slug>` and the same shape via `describeStandard()`. Two layouts exist:

- **checklist** — ISO 9001, ISO 42001 and every custom upload. Rows are `section`, `subsection` or `question`. All of them render through the same `ChecklistPage` + `ChecklistTable`.
- **controls** — ISO 27001's flat list of Annex A controls, rendered by `ISO27001.jsx` with the same table styles.

Every row from the API carries `dbId` (the database primary key). Files are linked to clauses by `dbId`, which is what lets one `useFiles()` hook serve every page.

## State

[GlobalProvider](../src/state/GlobalProvider.jsx) holds:

| Value | Purpose |
|---|---|
| `user`, `token` | Signed-in user; persisted in `sessionStorage` (`qms_auth_v1`) |
| `login()`, `logout()` | |
| `request(path, options)` | `apiFetch` with the token attached. A `401` signs the user out. |
| `customStandards` | `[{ slug, name }]`, loaded after login; drives the sidebar, landing page and Evidence tabs |
| `rowsByStandard` | `{ [standardId]: rows }`, filled on demand by `loadStandard(id)` |
| `updateRow(id, row, field, value)` | Optimistic edit; rolled back and re-thrown if the server rejects it |
| `deleteRow`, `createCustomStandard`, `deleteCustomStandard` | |

Pages normally use the hooks rather than the context directly:

- **`useStandard(id)`** loads a standard and returns `{ standard, rows, loading, error, saveField, removeRow }`. `saveField(row, field)` returns an `onSave` handler for `<InlineEdit>` that shows a toast on failure.
- **`useFiles()`** returns uploaded files, a `linksByClause` map (`dbId → [{ file, comment }]`) and `uploadFile`, `attachClauses`, `detachClause`, `updateComment`, `deleteFile`.

## Talking to the API

Always go through `request()` from `useGlobal()` (or `apiFetch` for unauthenticated calls). Paths are relative — `/api/...`, `/auth/...`, `/uploads/...` — and Vite proxies them to the backend in development ([vite.config.js](../vite.config.js); override the target with `VITE_API_TARGET`). Errors are thrown as `ApiError` with the server's message and HTTP `status`.

## Design system

[styles.css](../src/styles.css) defines colour, radius and shadow tokens on `:root` and a class for every building block. Use the components in [components/ui](../src/components/ui) instead of inline styles:

| Component | Use for |
|---|---|
| `PageHeader` | Eyebrow + title + subtitle + action buttons at the top of every page (also sets the tab title) |
| `Panel` | Card with the black header strip, optional footer |
| `Button` / `IconButton` | Variants: `primary`, `dark`, `outline`, `secondary`, `soft`, `ghost`; size `sm` |
| `InlineEdit` | Click-to-edit text. Handles draft state, Save/Cancel, Esc and Ctrl/⌘+Enter |
| `Tag`, `TagList`, `CountPill` | Clause ids, roles, comma-separated values, counts |
| `SearchInput`, `Field`, `Alert`, `EmptyState` | Forms, messages, empty/loading states |
| `Icon` | Stroke icons by name (`grid`, `shield`, `upload`, `trash`, …) |

User feedback goes through `useToast()` (`toast.success()` / `toast.error()`); destructive actions confirm with `window.confirm`.

## Testing

```bash
npm test              # Vitest, single run
npm run test:watch
npm run test:coverage
```

Suites in [src/\_\_tests\_\_](../src/__tests__) cover the spreadsheet parser, checklist grouping, formatting helpers, the API client, `InlineEdit`, the checklist page (rendering, search, collapse, editing, export, guest read-only), the landing page, and the custom-standard upload flow. [testUtils.jsx](../src/__tests__/testUtils.jsx) renders a component with fake context values.
