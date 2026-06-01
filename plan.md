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

## Next steps

### 1. Build out the frontend UI (top priority)
- Note list panel on the left, markdown editor/viewer on the right
- Create, edit, and delete notes from the UI (wire to the existing CRUD endpoints)

### 2. Add tags support
- Extend schema: `tags` table + `note_tags` join table
- `GET /tags` endpoint
- `GET /notes?tag=` filter
- Include `tags` string array in note payloads
- Auto-manage join table on create/update
