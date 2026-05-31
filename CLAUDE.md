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

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notes` | List all notes (optional `?tag=` filter) |
| POST | `/notes` | Create note |
| GET | `/notes/{id}` | Get note |
| PUT | `/notes/{id}` | Replace note |
| DELETE | `/notes/{id}` | Delete note |
| GET | `/tags` | List all tags |

Note payloads include a `tags` string array. Tags are managed automatically — adding/removing from the array on a PATCH updates the join table.

## Frontend

**Start:** `cd frontend && npm run dev`

Next.js app on `http://localhost:3000`. API base: `http://localhost:3000` (proxied) or `http://localhost:8000` directly.

## Dev tips

- CORS is configured for `http://localhost:3000` only. Update `allow_origins` in `main.py` for other origins.
- Run backend and frontend in separate terminals.
- Seed sample data: `sqlite3 backend/data/notes.db` with INSERT statements (see README step 4).

## Current state (as of 2026-06-01)

- Backend: only `GET /notes` is implemented. All other endpoints listed above are planned but not yet built.
- Frontend: scaffold only — `page.tsx` is an empty shell. TypeScript types are auto-generated from the backend OpenAPI schema into `frontend/lib/api.d.ts` via `npm run types:generate`.
- No tags support in the DB yet — the schema has only the `notes` table (`id`, `title`, `content`, `created_at`, `updated_at`).
