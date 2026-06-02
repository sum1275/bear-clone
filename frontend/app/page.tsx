"use client";

import { useNotes } from "@/hooks/useNotes";
import NoteForm from "@/components/NoteForm";
import NoteItem from "@/components/NoteItem";

export default function Home() {
  const { notes, loading, error, create, remove } = useNotes();

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Notes</h1>

      <NoteForm onCreate={create} />

      {loading && <p className="text-foreground/60">Loading…</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && notes.length === 0 && (
        <p className="text-foreground/60">No notes yet.</p>
      )}

      {!loading && !error && notes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} onDelete={remove} />
          ))}
        </ul>
      )}
    </main>
  );
}
