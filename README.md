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

### 3. Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.
