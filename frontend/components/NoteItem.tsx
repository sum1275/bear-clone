"use client";

import type { Note } from "@/lib/notes";

export default function NoteItem({
  note,
  onDelete,
}: {
  note: Note;
  onDelete: (id: number) => void;
}) {
  return (
    <li className="rounded-lg border border-foreground/10 p-4">
      <h2 className="font-semibold">{note.title || "Untitled"}</h2>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/70">{note.content}</p>
      <time className="mt-2 block text-xs text-foreground/40">
        {new Date(note.updated_at).toLocaleString()}
      </time>
      <button
        className="mt-2 block text-xs text-foreground/40 cursor-pointer"
        onClick={() => onDelete(note.id)}
      >
        Delete
      </button>
    </li>
  );
}
