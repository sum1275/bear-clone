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

## Dev tips

- CORS is configured for `http://localhost:3000` only. Update `allow_origins` in `main.py` for other origins.
- Run backend and frontend in separate terminals.
- Seed sample data: `sqlite3 backend/data/notes.db` with INSERT statements (see README step 4).

## Current state (as of 2026-06-01)

- Backend: full notes CRUD is implemented — `GET /notes`, `POST /notes`, `GET /notes/{id}`, `PUT /notes/{id}`, `DELETE /notes/{id}` (see [backend/main.py](backend/main.py)).
- Frontend: [frontend/app/page.tsx](frontend/app/page.tsx) fetches `GET /notes` and renders the list (title, content, updated_at) with loading/error/empty states. No create/edit/delete UI yet. TypeScript types are auto-generated from the backend OpenAPI schema into `frontend/lib/api.d.ts` via `npm run types:generate`.
- No tags support yet — the schema has only the `notes` table (`id`, `title`, `content`, `created_at`, `updated_at`); no tags table, `/tags` endpoint, or `?tag=` filter.
