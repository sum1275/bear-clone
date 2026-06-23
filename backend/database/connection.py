import aiosqlite
import asyncpg
import os
from config import settings
from utils.logger import logger

# Global connection pool for PostgreSQL
_pg_pool = None

async def _init_postgres():
    """Initialize PostgreSQL connection pool and create tables"""
    global _pg_pool
    try:
        _pg_pool = await asyncpg.create_pool(
            host=settings.db_host,
            port=settings.db_port,
            user=settings.db_user,
            password=settings.db_password,
            database=settings.db_name,
            min_size=5,
            max_size=20,
            ssl=True
        )

        # Create tables
        async with _pg_pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username TEXT NOT NULL UNIQUE,
                    email TEXT NOT NULL UNIQUE,
                    hashed_password TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS notes (
                    id SERIAL PRIMARY KEY,
                    title TEXT NOT NULL DEFAULT '',
                    content TEXT NOT NULL DEFAULT '',
                    user_id INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS tags (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL
                );
            """)

            await conn.execute("""
                CREATE TABLE IF NOT EXISTS note_tags (
                    note_id INTEGER NOT NULL,
                    tag_id INTEGER NOT NULL,
                    PRIMARY KEY (note_id, tag_id),
                    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
                );
            """)
            

        logger.info(f"PostgreSQL database initialized: {settings.db_name}")
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL: {e}", exc_info=True)
        raise

async def _init_sqlite():
    """Initialize SQLite database and create tables"""
    try:
        # Create directory if doesn't exist
        db_dir = os.path.dirname(settings.db_path)
        os.makedirs(db_dir, exist_ok=True)

        # Connect and create tables
        async with aiosqlite.connect(settings.db_path) as db:
            await db.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE,
                    email TEXT NOT NULL UNIQUE,
                    hashed_password TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL DEFAULT '',
                    content TEXT NOT NULL DEFAULT '',
                    user_id INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS note_tags (
                    note_id INTEGER NOT NULL,
                    tag_id INTEGER NOT NULL,
                    PRIMARY KEY (note_id, tag_id),
                    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
                );
            """)
            await db.commit()

        logger.info(f"SQLite database initialized at {settings.db_path}")
    except Exception as e:
        logger.error(f"Failed to initialize SQLite: {e}", exc_info=True)
        raise

async def init_db():
    """Initialize database on app startup (SQLite or PostgreSQL)"""
    if settings.is_postgres:
        await _init_postgres()
    else:
        await _init_sqlite()

async def close_db():
    """Close database connection on app shutdown"""
    global _pg_pool
    if settings.is_postgres and _pg_pool:
        await _pg_pool.close()
        _pg_pool = None

async def get_db():
    """
    Dependency injection: Provides database connection to endpoints.
    Works with both SQLite and PostgreSQL.

    For PostgreSQL: Returns asyncpg Connection
    For SQLite: Returns aiosqlite Connection

    Usage in routes:
        @app.get("/notes")
        async def list_notes(db = Depends(get_db)):
            cursor = await db.execute("SELECT * FROM notes")
    """
    if settings.is_postgres:
        async with _pg_pool.acquire() as conn:
            yield conn
    else:
        async with aiosqlite.connect(settings.db_path) as db:
            db.row_factory = aiosqlite.Row
            yield db
