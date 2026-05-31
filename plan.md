# Bear Clone — V1 Plan

## Done

- [x] FastAPI backend scaffold with aiosqlite
- [x] SQLite schema (`notes` table) created in `init_db()`
- [x] `GET /notes` endpoint
- [x] CORS configured for `http://localhost:3000`
- [x] Next.js frontend scaffold with empty `page.tsx`
- [x] TypeScript type generation from backend OpenAPI schema (`npm run types:generate` → `frontend/lib/api.d.ts`)
- [x] README: full setup guide including seed data instructions (sqlite3 INSERT)

## Next steps

### 1. Build the frontend UI (top priority)
- Note list panel on the left, markdown editor/viewer on the right
- Wire to `GET /notes` to display existing notes
- Create, edit, and delete notes from the UI

### 2. Add remaining backend endpoints
- `POST /notes` — create a new note
- `GET /notes/{id}` — get a single note
- `PUT /notes/{id}` — replace an existing note
- `DELETE /notes/{id}` — delete a note

### 3. Add tags support
- Extend schema: `tags` table + `note_tags` join table
- `GET /tags` endpoint
- Include `tags` string array in note payloads
- Auto-manage join table on create/update
