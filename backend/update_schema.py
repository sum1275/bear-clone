import asyncpg
import asyncio

async def update_schema():
    try:
        conn = await asyncpg.connect(
            host='localhost',
            port=5432,
            user='postgres',
            password='Optimus@323',
            database='bear_notes'
        )

        # Check if column already exists
        result = await conn.fetch("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='notes' AND column_name='user_id'
            )
        """)

        if result[0][0]:
            print("[OK] user_id column already exists")
            await conn.close()
            return

        print("[*] Adding user_id column to notes table...")
        await conn.execute("ALTER TABLE notes ADD COLUMN user_id INTEGER DEFAULT 1;")
        print("[OK] Column added")

        print("[*] Adding foreign key constraint...")
        await conn.execute("""
            ALTER TABLE notes ADD CONSTRAINT fk_notes_user_id
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        """)
        print("[OK] Foreign key added")

        print("[*] Making user_id NOT NULL...")
        await conn.execute("ALTER TABLE notes ALTER COLUMN user_id SET NOT NULL;")
        print("[OK] Set NOT NULL")

        print("[*] Removing default...")
        await conn.execute("ALTER TABLE notes ALTER COLUMN user_id DROP DEFAULT;")
        print("[OK] Default removed")

        print("\n[SUCCESS] Database schema updated successfully!")
        await conn.close()

    except Exception as e:
        print(f"[ERROR] {type(e).__name__}: {e}")

asyncio.run(update_schema())
