# Bear Clone — V1 Plan

## Done

- [x] FastAPI backend scaffold with aiosqlite
- [x] SQLite schema (`notes` table) created in `init_db()`
- [x] Full notes CRUD: `GET /notes`, `POST /notes`, `GET /notes/{id}`, `PUT /notes/{id}`, `DELETE /notes/{id}` (with 404 handling)
- [x] CORS configured for `http://localhost:3000`
- [x] Next.js frontend scaffold
- [x] Frontend notes list — `app/page.tsx` fetches `GET /notes` and renders title/content/updated_at with loading/error/empty states
- [x] TypeScript type generation from backend OpenAPI schema (`npm run types:generate` → `frontend/lib/api.d.ts`)
- [x] README: full setup guide including seed data instructions (sqlite3 INSERT)
- [x] **Frontend rebuild — Bear-style responsive app** (matches design prototype)
  - [x] Three-pane Mac layout (sidebar / note list / editor + info panel) collapsing to single-column phone layout below 860px
  - [x] Custom markdown→HTML renderer (`lib/markdown.ts`) — headings, marks, links, inline tags, checklists, tables, blockquotes, fenced code
  - [x] Compose / edit / delete wired to existing CRUD; rendered-markdown ↔ raw-textarea editor with a formatting pill
  - [x] Client-side derivation: nested `#tag` tree w/ counts (`lib/tags.ts`), note stats, TOC, and smart lists (Untagged / To-Do / Today)
  - [x] 4 themes (light / dark / sepia / midnight) persisted to `localStorage`
  - [x] Session-only pin / lock / archive UI state; Trash "delete forever" hits the real `DELETE`

## Next steps

### 1. Add tags support (backend) — top priority
Tags currently exist only client-side (derived from `#hashtags`), so they are
not persisted or server-searchable. Promote them to first-class data:
- Extend schema: `tags` table + `note_tags` join table
- `GET /tags` endpoint
- `GET /notes?tag=` filter
- Include `tags` string array in note payloads
- Auto-manage join table on create/update
- Frontend: source the sidebar tag tree / filters from the API instead of
  re-deriving from content on every render

### 2. Persist note metadata (optional)
Pin / lock / archive are session-only UI state today. If they should survive a
reload, add columns/flags to the `notes` schema and a way to set them
(e.g. `PATCH /notes/{id}`), then back the ephemeral `Set`s in `NotesApp` with
the API.
