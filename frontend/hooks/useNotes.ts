"use client";

import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/notes";
import type { NoteCreate } from "@/lib/notes";

export function useNotes() {
  const [notes, setNotes] = useState<api.Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      setNotes(await api.listNotes());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Each mutation re-fetches so the UI always reflects backend state, and the
  // result is returned so callers can react to it (e.g. select a new note).
  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        const result = await fn();
        await loadNotes();
        return result;
      } catch (err) {
        setError((err as Error).message);
        return undefined;
      }
    },
    [loadNotes],
  );

  const create = useCallback((note: NoteCreate) => run(() => api.createNote(note)), [run]);
  const edit = useCallback(
    (id: number, note: NoteCreate) => run(() => api.updateNote(id, note)),
    [run],
  );
  const remove = useCallback((id: number) => run(() => api.deleteNote(id)), [run]);

  return { notes, loading, error, create, edit, remove };
}
