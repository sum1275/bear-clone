from typing import List, Optional, Tuple, Union
import aiosqlite
import asyncpg
from config import settings

class NoteRepository:
    """
    Data access layer for notes.
    Works with both SQLite and PostgreSQL.

    Responsibilities:
    - Build SQL queries (database-agnostic)
    - Execute queries
    - Return raw data from database

    Does NOT handle:
    - Business logic (validation, rules)
    - Logging (happens in service layer)
    - HTTP concerns
    """

    @staticmethod
    async def get_all(
        db: Union[aiosqlite.Connection, asyncpg.Connection],
        user_id: int,
        search: str = "",
        page: int = 1,
        page_size: int = 10
    ) -> Tuple[List[dict], int, int]:
        """
        Get all notes for a user with optional search and pagination.
        Works with SQLite and PostgreSQL.

        Args:
            db: Database connection (SQLite or PostgreSQL)
            user_id: Filter notes by user ID
            search: Optional search term (searches title + content)
            page: Page number (1-indexed)
            page_size: Notes per page

        Returns:
            (notes_list, total_count, total_pages)
        """
        if settings.is_postgres:
            return await NoteRepository._get_all_postgres(db, user_id, search, page, page_size)
        else:
            return await NoteRepository._get_all_sqlite(db, user_id, search, page, page_size)

    @staticmethod
    async def _get_all_sqlite(
        db: aiosqlite.Connection,
        user_id: int,
        search: str,
        page: int,
        page_size: int
    ) -> Tuple[List[dict], int, int]:
        """SQLite implementation of get_all with user_id filter"""
        query = "SELECT * FROM notes WHERE user_id = ?"
        params = [user_id]

        if search:
            query += " AND (title LIKE ? OR content LIKE ?)"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern])

        count_query = "SELECT COUNT(*) FROM notes WHERE user_id = ?"
        count_params = [user_id]
        if search:
            count_query += " AND (title LIKE ? OR content LIKE ?)"
            count_params.extend([search_pattern, search_pattern])

        cursor = await db.execute(count_query, count_params)
        total = (await cursor.fetchone())[0]
        total_pages = (total + page_size - 1) // page_size

        offset = (page - 1) * page_size
        query += f" LIMIT {page_size} OFFSET {offset}"

        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        notes = [dict(row) for row in rows]

        return notes, total, total_pages

    @staticmethod
    async def _get_all_postgres(
        db: asyncpg.Connection,
        user_id: int,
        search: str,
        page: int,
        page_size: int
    ) -> Tuple[List[dict], int, int]:
        """PostgreSQL implementation of get_all with user_id filter"""
        if search:
            search_pattern = f"%{search}%"
            rows = await db.fetch(
                "SELECT * FROM notes WHERE user_id = $1 AND (title ILIKE $2 OR content ILIKE $3) OFFSET $4 LIMIT $5",
                user_id, search_pattern, search_pattern, (page - 1) * page_size, page_size
            )
            total = await db.fetchval(
                "SELECT COUNT(*) FROM notes WHERE user_id = $1 AND (title ILIKE $2 OR content ILIKE $3)",
                user_id, search_pattern, search_pattern
            )
        else:
            rows = await db.fetch(
                "SELECT * FROM notes WHERE user_id = $1 OFFSET $2 LIMIT $3",
                user_id, (page - 1) * page_size, page_size
            )
            total = await db.fetchval("SELECT COUNT(*) FROM notes WHERE user_id = $1", user_id)

        total_pages = (total + page_size - 1) // page_size
        notes = [dict(row) for row in rows]

        return notes, total, total_pages

    @staticmethod
    async def get_by_id(
        db: Union[aiosqlite.Connection, asyncpg.Connection],
        note_id: int
    ) -> Optional[dict]:
        """
        Get a single note by ID.

        Args:
            db: Database connection (SQLite or PostgreSQL)
            note_id: Note ID to fetch

        Returns:
            Note dict if found, None otherwise
        """
        if settings.is_postgres:
            from utils.logger import logger
            logger.info(f"Fetching note by id: {note_id}")
            row = await db.fetchrow("SELECT * FROM notes WHERE id = $1", note_id)
            logger.info(f"Fetch result: {dict(row) if row else 'None'}")
            return dict(row) if row else None
        else:
            cursor = await db.execute("SELECT * FROM notes WHERE id = ?", (note_id,))
            row = await cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    async def create(
        db: Union[aiosqlite.Connection, asyncpg.Connection],
        user_id: int,
        title: str,
        content: str,
        created_at: str
    ) -> dict:
        """
        Create a new note.

        Args:
            db: Database connection (SQLite or PostgreSQL)
            user_id: User ID (owner of the note)
            title: Note title
            content: Note content (markdown)
            created_at: ISO timestamp

        Returns:
            Created note dict (with id)
        """
        if settings.is_postgres:
            from utils.logger import logger
            logger.info(f"Inserting note: user_id={user_id}, title={title}, created_at={created_at}")
            note_id = await db.fetchval(
                "INSERT INTO notes (user_id, title, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING id",
                user_id, title, content, created_at, created_at
            )
            logger.info(f"Insert result - note_id: {note_id}")
        else:
            cursor = await db.execute(
                "INSERT INTO notes (user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (user_id, title, content, created_at, created_at)
            )
            await db.commit()
            note_id = cursor.lastrowid

        return await NoteRepository.get_by_id(db, note_id)

    @staticmethod
    async def update(
        db: Union[aiosqlite.Connection, asyncpg.Connection],
        note_id: int,
        title: str,
        content: str,
        updated_at: str
    ) -> Optional[dict]:
        """
        Update an existing note.

        Args:
            db: Database connection (SQLite or PostgreSQL)
            note_id: Note ID to update
            title: New title
            content: New content
            updated_at: ISO timestamp

        Returns:
            Updated note dict if found, None if not found
        """
        if settings.is_postgres:
            result = await db.execute(
                "UPDATE notes SET title = $1, content = $2, updated_at = $3 WHERE id = $4",
                title, content, updated_at, note_id
            )
            # Check if any rows were affected
            if result == "UPDATE 0":
                return None
        else:
            cursor = await db.execute(
                "UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?",
                (title, content, updated_at, note_id)
            )
            await db.commit()
            if cursor.rowcount == 0:
                return None

        return await NoteRepository.get_by_id(db, note_id)

    @staticmethod
    async def delete(
        db: Union[aiosqlite.Connection, asyncpg.Connection],
        note_id: int
    ) -> bool:
        """
        Delete a note by ID.

        Args:
            db: Database connection (SQLite or PostgreSQL)
            note_id: Note ID to delete

        Returns:
            True if note was deleted, False if not found
        """
        if settings.is_postgres:
            result = await db.execute("DELETE FROM notes WHERE id = $1", note_id)
            return result != "DELETE 0"
        else:
            cursor = await db.execute("DELETE FROM notes WHERE id = ?", (note_id,))
            await db.commit()
            return cursor.rowcount > 0

class TagRepository:
    """Data access layer for tags"""

    @staticmethod
    async def create_tag(
        db: Union[aiosqlite.Connection, asyncpg.Connection],
        name: str,
        created_at: str
    ) -> dict:
        """Create a new tag"""
        if settings.is_postgres:
            tag_id = await db.fetchval(
                "INSERT INTO tags (name, created_at) VALUES ($1, $2) RETURNING id",
                name, created_at
            )
        else:
            cursor = await db.execute(
                "INSERT INTO tags (name, created_at) VALUES (?, ?)",
                (name, created_at)
            )
            await db.commit()
            tag_id = cursor.lastrowid

        return {"id": tag_id, "name": name, "created_at": created_at}

    @staticmethod
    async def get_all_tags(
        db: Union[aiosqlite.Connection, asyncpg.Connection]
    ) -> List[dict]:
        """Get all tags"""
        if settings.is_postgres:
            rows = await db.fetch("SELECT * FROM tags ORDER BY name")
        else:
            cursor = await db.execute("SELECT * FROM tags ORDER BY name")
            rows = await cursor.fetchall()

        return [dict(row) for row in rows]

    @staticmethod
    async def add_tag_to_note(
        db: Union[aiosqlite.Connection, asyncpg.Connection],
        note_id: int,
        tag_id: int
    ) -> bool:
        """Link a tag to a note"""
        try:
            if settings.is_postgres:
                await db.execute(
                    "INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2)",
                    note_id, tag_id
                )
            else:
                await db.execute(
                    "INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)",
                    (note_id, tag_id)
                )
                await db.commit()
            return True
        except Exception:
            return False
    
    @staticmethod
    async def get_tags_for_note(
        db: Union[aiosqlite.Connection, asyncpg.Connection],
        note_id: int
    ) -> List[dict]:
        """Get all tags for a specific note"""
        if settings.is_postgres:
            rows = await db.fetch(
                "SELECT t.* FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = $1",
                note_id
            )
        else:
            cursor = await db.execute(
                "SELECT t.* FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?",
                (note_id,)
            )
            rows = await cursor.fetchall()

        return [dict(row) for row in rows]

    @staticmethod
    async def get_notes_by_tag(
        db: Union[aiosqlite.Connection, asyncpg.Connection],
        tag_id: int
    ) -> List[dict]:
        """Get all notes with a specific tag"""
        if settings.is_postgres:
            rows = await db.fetch(
                "SELECT n.* FROM notes n JOIN note_tags nt ON n.id = nt.note_id WHERE nt.tag_id = $1",
                tag_id
            )
        else:
            cursor = await db.execute(
                "SELECT n.* FROM notes n JOIN note_tags nt ON n.id = nt.note_id WHERE nt.tag_id = ?",
                (tag_id,)
            )
            rows = await cursor.fetchall()

        return [dict(row) for row in rows]

    @staticmethod
    async def remove_tag_from_note(
        db: Union[aiosqlite.Connection, asyncpg.Connection],
        note_id: int,
        tag_id: int
    ) -> bool:
        """Remove a tag from a note"""
        try:
            if settings.is_postgres:
                await db.execute(
                    "DELETE FROM note_tags WHERE note_id = $1 AND tag_id = $2",
                    note_id, tag_id
                )
            else:
                await db.execute(
                    "DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?",
                    (note_id, tag_id)
                )
                await db.commit()
            return True
        except Exception:
            return False

class UserRepository:
    """Data access layer for users"""

    @staticmethod
    async def create_user(
        db: Union[aiosqlite.Connection, asyncpg.Connection],
        username: str,
        email: str,
        hashed_password: str,
        created_at: str
    ) -> dict:
        """Create new user"""
        if settings.is_postgres:
            user_id = await db.fetchval(
                "INSERT INTO users (username, email, hashed_password, created_at) VALUES ($1, $2, $3, $4) RETURNING id",
                username, email, hashed_password, created_at
            )
        else:
            cursor = await db.execute(
                "INSERT INTO users (username, email, hashed_password, created_at) VALUES (?, ?, ?, ?)",
                (username, email, hashed_password, created_at)
            )
            await db.commit()
            user_id = cursor.lastrowid

        return {"id": user_id, "username": username, "email": email, "created_at": created_at}

    @staticmethod
    async def get_user_by_username(
        db: Union[aiosqlite.Connection, asyncpg.Connection],
        username: str
    ) -> Optional[dict]:
        """Get user by username"""
        if settings.is_postgres:
            row = await db.fetchrow("SELECT * FROM users WHERE username = $1", username)
            return dict(row) if row else None
        else:
            cursor = await db.execute("SELECT * FROM users WHERE username = ?", (username,))
            row = await cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    async def get_user_by_email(
        db: Union[aiosqlite.Connection, asyncpg.Connection],
        email: str
    ) -> Optional[dict]:
        """Get user by email"""
        if settings.is_postgres:
            row = await db.fetchrow("SELECT * FROM users WHERE email = $1", email)
            return dict(row) if row else None
        else:
            cursor = await db.execute("SELECT * FROM users WHERE email = ?", (email,))
            row = await cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    async def get_user_by_id(
        db: Union[aiosqlite.Connection, asyncpg.Connection],
        user_id: int
    ) -> Optional[dict]:
        """Get user by ID"""
        if settings.is_postgres:
            row = await db.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
            return dict(row) if row else None
        else:
            cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = await cursor.fetchone()
            return dict(row) if row else None
