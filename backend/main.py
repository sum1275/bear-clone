import os
import aiosqlite
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "notes.db")


async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db


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

            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS note_tags (
                note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
                tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
                PRIMARY KEY (note_id, tag_id)
            );
        """)
        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Bear Clone API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class NoteCreate(BaseModel):
    title: str = ""
    content: str = ""
    tags: list[str] = []


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[list[str]] = None


class NoteResponse(BaseModel):
    id: int
    title: str
    content: str
    tags: list[str]
    created_at: str
    updated_at: str


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def get_note_tags(db: aiosqlite.Connection, note_id: int) -> list[str]:
    async with db.execute(
        "SELECT t.name FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?",
        (note_id,),
    ) as cursor:
        rows = await cursor.fetchall()
    return [row["name"] for row in rows]


async def set_note_tags(db: aiosqlite.Connection, note_id: int, tags: list[str]):
    await db.execute("DELETE FROM note_tags WHERE note_id = ?", (note_id,))
    for tag_name in tags:
        await db.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag_name,))
        async with db.execute("SELECT id FROM tags WHERE name = ?", (tag_name,)) as cur:
            row = await cur.fetchone()
        await db.execute(
            "INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)",
            (note_id, row["id"]),
        )


async def row_to_note(db: aiosqlite.Connection, row) -> NoteResponse:
    tags = await get_note_tags(db, row["id"])
    return NoteResponse(
        id=row["id"],
        title=row["title"],
        content=row["content"],
        tags=tags,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@app.get("/notes", response_model=list[NoteResponse])
async def list_notes(tag: Optional[str] = None):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        if tag:
            async with db.execute(
                """
                SELECT n.* FROM notes n
                JOIN note_tags nt ON n.id = nt.note_id
                JOIN tags t ON t.id = nt.tag_id
                WHERE t.name = ?
                ORDER BY n.updated_at DESC
                """,
                (tag,),
            ) as cursor:
                rows = await cursor.fetchall()
        else:
            async with db.execute(
                "SELECT * FROM notes ORDER BY updated_at DESC"
            ) as cursor:
                rows = await cursor.fetchall()
        return [await row_to_note(db, row) for row in rows]


@app.post("/notes", response_model=NoteResponse, status_code=201)
async def create_note(body: NoteCreate):
    ts = now_iso()
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (body.title, body.content, ts, ts),
        ) as cursor:
            note_id = cursor.lastrowid
        await set_note_tags(db, note_id, body.tags)
        await db.commit()
        async with db.execute("SELECT * FROM notes WHERE id = ?", (note_id,)) as cur:
            row = await cur.fetchone()
        return await row_to_note(db, row)


@app.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(note_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM notes WHERE id = ?", (note_id,)) as cur:
            row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Note not found")
        return await row_to_note(db, row)


@app.patch("/notes/{note_id}", response_model=NoteResponse)
async def update_note(note_id: int, body: NoteUpdate):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM notes WHERE id = ?", (note_id,)) as cur:
            row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Note not found")

        title = body.title if body.title is not None else row["title"]
        content = body.content if body.content is not None else row["content"]
        ts = now_iso()

        await db.execute(
            "UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?",
            (title, content, ts, note_id),
        )
        if body.tags is not None:
            await set_note_tags(db, note_id, body.tags)
        await db.commit()

        async with db.execute("SELECT * FROM notes WHERE id = ?", (note_id,)) as cur:
            row = await cur.fetchone()
        return await row_to_note(db, row)


@app.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT id FROM notes WHERE id = ?", (note_id,)) as cur:
            row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Note not found")
        await db.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        await db.commit()


@app.get("/tags", response_model=list[str])
async def list_tags():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT name FROM tags ORDER BY name") as cur:
            rows = await cur.fetchall()
    return [row["name"] for row in rows]
