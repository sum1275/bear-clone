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

  // Each mutation re-fetches so the UI always reflects backend state.
  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        await fn();
        await loadNotes();
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [loadNotes],
  );

  const create = useCallback((note: NoteCreate) => run(() => api.createNote(note)), [run]);
  const edit = useCallback((id: number, note: NoteCreate) => run(() => api.updateNote(id, note)), [run]);
  const remove = useCallback((id: number) => run(() => api.deleteNote(id)), [run]);

  return { notes, loading, error, create, edit, remove };
}
