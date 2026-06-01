# bear-clone

A Bear notes app clone — markdown note-taking app.

## Prerequisites

- Python 3.11+
- Node.js 18+
- Git

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/akshaygpt/bear-clone.git
cd bear-clone
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

```bash
# Mac/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

Install dependencies and start the server:

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

> On Windows, if `uvicorn` isn't recognized, use: `python -m uvicorn main:app --reload`

Backend runs at `http://localhost:8000`. Verify with:

```bash
curl http://localhost:8000/notes
```

See [backend/API.md](backend/API.md) for the full endpoint reference and curl examples.

### 3. Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

### 4. Seed sample data (optional)

With the backend running, insert a few sample notes directly into the database:

```bash
sqlite3 backend/data/notes.db <<'EOF'
INSERT INTO notes (title, content, created_at, updated_at) VALUES
  ('Welcome to Bear Clone', '# Welcome\n\nThis is your first note. Start writing in **Markdown**!', datetime('now'), datetime('now')),
  ('Markdown cheatsheet', '## Headings\n\n# H1\n## H2\n\n## Emphasis\n\n*italic* **bold**\n\n## Lists\n\n- item one\n- item two\n\n## Code\n\n`inline code`\n\n```\ncode block\n```', datetime('now'), datetime('now')),
  ('Ideas', '- Build a tagging system\n- Add search\n- Dark mode', datetime('now'), datetime('now'));
EOF
```

Verify the rows were inserted:

```bash
sqlite3 backend/data/notes.db "SELECT id, title FROM notes;"
```

### 5. Generate TypeScript types

With the backend running, generate types from the API schema:

```bash
cd frontend
npm run types:generate
```

Re-run this whenever the backend models change.
