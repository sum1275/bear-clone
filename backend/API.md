# API reference

REST API for the Bear Clone backend (FastAPI). The server runs at `http://localhost:8000`.

All examples below target the backend directly on port `8000`. Swap to `http://localhost:3000` to go through the Next.js proxy.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notes` | List all notes |
| POST | `/notes` | Create a note |
| GET | `/notes/{id}` | Get a single note |
| PUT | `/notes/{id}` | Replace a note |
| DELETE | `/notes/{id}` | Delete a note |

A request for a non-existent id returns `404 {"detail": "Note not found"}`.

## Examples (curl)

### List all notes

```bash
curl http://localhost:8000/notes
```

### Create a note

Body: `{ "title": string, "content": string }`. Returns the created note with `201 Created`.

```bash
curl -X POST http://localhost:8000/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "My first note", "content": "Hello from curl"}'
```

### Get a single note

Replace `1` with the note id.

```bash
curl http://localhost:8000/notes/1
```

### Update a note

Body: `{ "title": string, "content": string }`. Replaces title and content; `updated_at` is refreshed automatically.

```bash
curl -X PUT http://localhost:8000/notes/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated title", "content": "Updated content"}'
```

### Delete a note

Returns `204 No Content`. Use `-i` to see the status code.

```bash
curl -i -X DELETE http://localhost:8000/notes/1
```
