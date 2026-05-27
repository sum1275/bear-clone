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
| PATCH | `/notes/{id}` | Update note |
| DELETE | `/notes/{id}` | Delete note |
| GET | `/tags` | List all tags |

Note payloads include a `tags` string array. Tags are managed automatically — adding/removing from the array on a PATCH updates the join table.

## Frontend

**Start:** `cd frontend && npm run dev`

Next.js app on `http://localhost:3000`. API base: `http://localhost:3000` (proxied) or `http://localhost:8000` directly.

## Dev tips

- CORS is configured for `http://localhost:3000` only. Update `allow_origins` in `main.py` for other origins.
- Run backend and frontend in separate terminals.
