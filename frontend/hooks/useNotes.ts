'use client';

import { useEffect, useState } from 'react';

interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/notes');
      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.status}`);
      }
      const data: Note[] = await response.json();
      setNotes(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notes');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return { notes, loading, error, refetch };
}