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
class NotesResponse(BaseModel):
    notes:List[Note]
    total:int
    pages:int
    current_page:int

@app.get("/notes", response_model=NotesResponse)
async def list_notes(search:str='',page:int=1,limit:int=20):
    async with aiosqlite.connect(DB_PATH) as db: # opens a connection to the SQLite file
        db.row_factory = aiosqlite.Row # makes rows behave like dicts instead of plain tuples
        
        where_clause=''
        params=[]
        if search:
            where_clause='WHERE title LIKE ? OR content LIKE ?'
            search_pattern=f"%{search}%"
            params=[search_pattern,search_pattern]
        
        count_query=f"SELECT COUNT(*) as count FROM notes {where_clause}"    
        async with db.execute(count_query,params) as cursor:
            total=(await cursor.fetchone())["count"]
            
            pages= (total + limit-1) // limit
            
            offset=(page-1)*limit
            # query=f"SELECT * FROM notes {where_clause} ORDER BY updated_at DESC LIMIT ? OFFSET?"
            query = f"SELECT * FROM notes {where_clause} ORDER BY updated_at DESC LIMIT ? OFFSET ?"

            params.extend([limit,offset])
            
            async with db.execute(query,params) as cursor:
                rows=await cursor.fetchall()
                
                notes=[dict(row) for row in rows]
                
                return {
                    "notes":notes,
                    "total":total,
                    "pages":pages,
                    "current_page":page
                }
            
   
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
