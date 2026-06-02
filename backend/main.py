from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import aiosqlite
from contextlib import asynccontextmanager
from datetime import datetime, timezone

@asynccontextmanager
async def lifespan(app: FastAPI):
  await init_db()
  yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "notes.db")

async def init_db():
  os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
  async with aiosqlite.connect(DB_PATH) as db:
    await db.executescript("""
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    """)
    await db.commit()

class Note(BaseModel):
    id: int
    title: str
    content: str
    created_at: str
    updated_at: str

class NoteCreate(BaseModel):
   title: str
   content: str

@app.get("/notes", response_model=List[Note])
async def list_notes():
    async with aiosqlite.connect(DB_PATH) as db: # opens a connection to the SQLite file
        db.row_factory = aiosqlite.Row # makes rows behave like dicts instead of plain tuples
        async with db.execute("SELECT * FROM notes") as cursor: 
            rows = await cursor.fetchall() # fetches all result rows into memory
    return [dict(row) for row in rows] # converts each row to a plain dict so FastAPI can serialize it to JSON

@app.post("/notes", response_model=Note, status_code=201)
async def create_note(body: NoteCreate):
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
        "INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)", (body.title, body.content, now, now)
        )
        await db.commit()
        async with db.execute("SELECT * FROM notes WHERE id=?", (cursor.lastrowid,)) as c:
            row = await c.fetchone()
    return dict(row)

@app.get("/notes/{note_id}", response_model=Note)
async def get_note(note_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM notes WHERE id = ?", (note_id,)) as cursor:
            row = await cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return dict(row)

@app.put("/notes/{note_id}", response_model=Note)
async def update_note(note_id: int, body: NoteCreate):
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?", (body.title, body.content, now, note_id),)
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Note not found")
        async with db.execute("SELECT * FROM notes WHERE id = ?", (note_id,)) as c:
            row = await c.fetchone()
    return dict(row)

@app.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        await db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Note not found")