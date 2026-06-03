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
components/Editor      editor pane chrome: title input + top bar + formatting pill + ⋯ menu; embeds <LiveEditor>
components/LiveEditor  CodeMirror 6 live-preview editor (Bear-style; client-only). Exposes wrapInline/toggleLinePrefix/focus
components/Menu        reusable dropdown primitive (Menu/MenuHeader/MenuItem/MenuSep/SubMenu)
components/Settings    Bear-style Settings window (General / Typography / Themes tabs)
components/InfoPanel   Info (stats/dates/tags) + Outline (TOC) tabs
components/icons       shared currentColor line-icon set
lib/markdown.ts        escape-first markdown->HTML renderer (Copy-as-HTML + table widget) + extractTags/noteStats/extractToc
lib/cm/*               CodeMirror live-preview engine: livePreview (decoration StateField), widgets (checkbox/bullet/hr/table), markdownExtras (#tag, ==hl==, [[wiki]] parsers), theme
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
- Editor: the note body uses a **CodeMirror 6 live-preview** editor (`components/LiveEditor` + `lib/cm/*`). The buffer is always raw markdown; decorations hide block syntax (heading `#`, quote `>`, list markers, code fences when the caret is elsewhere) and reveal inline delimiters (`**`/`*`/`~~`/`==`/`` ` ``) only when the caret is inside that span — so there is no font-size jump or reflow. Checkboxes/bullets/tables/`---` render as widgets (tables are render-only for now; inline cell editing is a TODO). `lib/markdown.ts` `renderMarkdown` is still used for Copy-as-HTML and the table widget.
- No tags support in the **backend** yet — the schema has only the `notes` table (`id`, `title`, `content`, `created_at`, `updated_at`); no tags table, `/tags` endpoint, or `?tag=` filter. Tags currently live only client-side (derived from `#hashtags`), so they are not searchable server-side and reset nothing on the backend.

### Editor tradeoffs & known limitations

Decisions made while building the CodeMirror live-preview editor — read before
extending `lib/cm/*`:

- **New dependency surface.** ~22 `@codemirror/*` + `@lezer/*` packages were added
  to a previously dependency-light frontend. We chose CM's correctness (caret,
  undo/redo, IME, selection, line wrapping) over hand-rolling a contenteditable;
  the cost is bundle weight and a real editor framework to learn.
- **Two rendering paths to keep in sync.** The editor renders via CM decorations
  (`lib/cm/*`); Copy-as-HTML and the table widget still use
  `lib/markdown.ts` `renderMarkdown`. The CM inline parsers in
  `lib/cm/markdownExtras.ts` (`#tag`, `==highlight==`, `[[wikilink]]`) can drift
  from `markdown.ts`'s regex detection — change both when you change syntax. The
  first-pass `doc.css` tweaks (subtle gray markers, 4px code radius, inherited
  font sizes) now only affect those non-editor render paths.
- **Whole-document parse on every change.** `livePreview` rebuilds decorations
  over the *entire* doc on each doc/selection change (`ensureSyntaxTree`). Fine
  for note-sized text; it is not windowed to the viewport, so it would not scale
  to very large documents. (A `ViewPlugin` would window it but can't host the
  block / line-crossing decorations the table widget and fence collapsing need —
  hence the `StateField`.)
- **Heading markers are hidden even when the caret is on the line** (per the Bear
  spec). Unlike Obsidian you never see the `#`; deleting heading formatting means
  backspacing over the hidden atomic marker.
- **Fenced-code fences aren't truly collapsed.** When the caret is outside, the
  ```` ``` ````/lang lines stay as slim empty "padding bands" (`font-size:0`) — hiding
  the line breaks outright broke line-decoration ownership, so we approximate the
  block's padding instead of removing the lines.
- **Regular `[text](url)` links aren't decorated yet** — they show raw in the
  editor (only `[[wikilinks]]` are handled, which is what the seed data uses).
  Code blocks are styled but **not** syntax-highlighted.
- **Tables are render-only.** The whole table is an atomic widget; you can't edit
  cells inline yet (deleting/replacing means editing around it). Inline table
  editing is the planned follow-up.
- **`toggleLinePrefix`** (pill H / list / checkbox) is a naive exact-prefix toggle
  (`"# "`), so it doesn't cycle heading levels or recognize `"## "`.
- **No automated editor tests.** The decoration logic is DOM/CM-heavy and is
  verified by manual browser testing; the old `lib/segments` unit tests were
  removed with the file, so automated editor coverage dropped. `lib/markdown.ts`,
  `tags`, `view`, and `settings` tests still cover the non-editor logic.
