"use client";

import { useEffect, useState } from "react";
import type { components } from "@/lib/api";

type Note = components["schemas"]["Note"];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/notes`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch notes: ${res.status}`);
        return res.json();
      })
      .then((data: Note[]) => setNotes(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Notes</h1>

      {loading && <p className="text-foreground/60">Loading…</p>}

      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && notes.length === 0 && (
        <p className="text-foreground/60">No notes yet.</p>
      )}

      {!loading && !error && notes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border border-foreground/10 p-4"
            >
              <h2 className="font-semibold">{note.title || "Untitled"}</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/70">
                {note.content}
              </p>
              <time className="mt-2 block text-xs text-foreground/40">
                {new Date(note.updated_at).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
