# Bear Clone

A Bear notes app clone — markdown note-taking with tag support.

## Project structure

```
backend/   FastAPI + aiosqlite REST API
frontend/  Next.js app
```

## Backend

**Start:** `cd backend && source venv/bin/activate && uvicorn main:app --reload`

- Python/FastAPI, SQLite via aiosqlite
- DB file: `backend/data/notes.db` (auto-created on first run)
- No migrations library — schema is created in `main.py:init_db()` via `CREATE TABLE IF NOT EXISTS`

### Endpoints

| Method | Path | Description | Status |
|--------|------|-------------|--------|
| GET | `/notes` | List all notes | ✅ implemented |
| POST | `/notes` | Create note | ✅ implemented |
| GET | `/notes/{id}` | Get note (404 if missing) | ✅ implemented |
| PUT | `/notes/{id}` | Replace note (404 if missing) | ✅ implemented |
| DELETE | `/notes/{id}` | Delete note (204, 404 if missing) | ✅ implemented |
| GET | `/notes?tag=` | Filter notes by tag | planned (needs tags) |
| GET | `/tags` | List all tags | planned (needs tags) |

Create/update payloads (`NoteCreate`) take `title` and `content`. Tags are not yet supported — no `tags` array in payloads and no join table in the schema.

## Frontend

**Start:** `cd frontend && npm run dev`

Next.js app on `http://localhost:3000`. API base: `http://localhost:3000` (proxied) or `http://localhost:8000` directly.

> ⚠️ Non-standard Next.js (16.x) — read `frontend/AGENTS.md` and consult
> `node_modules/next/dist/docs/` before writing frontend code.

A Bear-style markdown notes app matching the design prototype. Responsive
single codebase: three-pane Mac layout (sidebar / note list / editor + info
panel) that collapses to a single-column phone layout below 860px.

Key modules:

```
app/page.tsx          renders <NotesApp/>
app/globals.css       manifest that @imports app/styles/*.css (split by concern; responsive.css last)
app/styles/*.css      foundation·shell·sidebar·note-list·editor·menu·info-panel·doc·settings·responsive
components/NotesApp    "use client" orchestrator — owns all UI state (incl. sort/preview/settings) + ⌥⌘ shortcuts
components/Sidebar     library rows w/ counts, nested tag tree, theme picker, ⚙ settings button
components/NoteList    "Notes ⌄" library dropdown (sort/preview/export + shortcuts), search, cards, FAB
components/Editor      Bear-style live editor (per-line render/raw) + formatting pill + ⋯ menu
components/Menu        reusable dropdown primitive (Menu/MenuHeader/MenuItem/MenuSep/SubMenu)
components/Settings    Bear-style Settings window (General / Typography / Themes tabs)
components/InfoPanel   Info (stats/dates/tags) + Outline (TOC) tabs
components/icons       shared currentColor line-icon set
lib/markdown.ts        escape-first markdown->HTML renderer + extractTags/noteStats/extractToc
lib/segments.ts        splits content into editable blocks (line-level; groups code/table/ol/quote)
lib/tags.ts            nested #tag tree w/ descendant counts + auto-assigned monochrome tag icons (tagIcon)
lib/view.ts            filter model (incl. pinned), sortNotes, ephemeral flag sets, list-derivation helpers
lib/download.ts        client-side text→file download + stripTags (Export actions)
lib/settings.ts        Settings model/defaults, localStorage load/save, typography→CSS-var mapping
hooks/useNotes.ts      fetch + create/edit/remove (each mutation re-fetches; returns saved note)
hooks/useSettings.ts   settings state + localStorage persistence (+ resetTypography)
```

**Settings** (`components/Settings`, persisted via `hooks/useSettings` → localStorage):
Typography metrics drive the editor live through `--doc-*` CSS vars
(`settingsToCssVars` → set on `.app`; read by doc.css/editor.css). Wired General
options: `newNoteWith` (compose seeds `# `) and `keepTags` (export strips tags
when off). Other General toggles persist but are not yet wired to behavior.

**Derived client-side, not persisted:** tags (from `#hashtags` in content),
stats, TOC, and smart lists (Untagged / To-Do / Today). Pin, lock, and archive
are session-only UI state (ephemeral `Set<number>` in `NotesApp`); Trash's
"delete forever" is the only flag action that hits the backend (the existing
`DELETE`). Theme is persisted to `localStorage` and applied via `data-theme`.

## Dev tips

- CORS is configured for `http://localhost:3000` only. Update `allow_origins` in `main.py` for other origins.
- Run backend and frontend in separate terminals.
- Seed sample data: `sqlite3 backend/data/notes.db` with INSERT statements (see README step 4).

## Current state (as of 2026-06-02)

- Backend: full notes CRUD is implemented — `GET /notes`, `POST /notes`, `GET /notes/{id}`, `PUT /notes/{id}`, `DELETE /notes/{id}` (see [backend/main.py](backend/main.py)). Unchanged by the frontend rebuild.
- Frontend: rebuilt as the Bear-style responsive app described above. Full compose/edit/delete UI wired to the existing CRUD; markdown rendering, derived tags/stats/TOC, theming, and the three-pane↔phone responsive layout all working. TypeScript types are auto-generated from the backend OpenAPI schema into `frontend/lib/api.d.ts` via `npm run types:generate`.
- No tags support in the **backend** yet — the schema has only the `notes` table (`id`, `title`, `content`, `created_at`, `updated_at`); no tags table, `/tags` endpoint, or `?tag=` filter. Tags currently live only client-side (derived from `#hashtags`), so they are not searchable server-side and reset nothing on the backend.
