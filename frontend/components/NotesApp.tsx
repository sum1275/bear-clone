"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotes } from "@/hooks/useNotes";
import type { Note } from "@/lib/notes";
import { buildTagTree } from "@/lib/tags";
import {
  emptyFlags,
  filterTitle,
  matchesFilter,
  matchesQuery,
  type Filter,
  type FlagSets,
} from "@/lib/view";
import { Sidebar, type ThemeName } from "@/components/Sidebar";
import { NoteList } from "@/components/NoteList";
import { Editor, type Draft } from "@/components/Editor";
import { InfoPanel } from "@/components/InfoPanel";

const THEME_KEY = "notes-theme";
const LIBRARY_TYPES = ["all", "untagged", "todo", "today", "locked", "archive", "trash"] as const;

export default function NotesApp() {
  const { notes, create, edit, remove } = useNotes();

  const [theme, setTheme] = useState<ThemeName>("light");
  const [filter, setFilter] = useState<Filter>({ type: "all" });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>({ title: "", content: "" });
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");
  const [flags, setFlags] = useState<FlagSets>(emptyFlags);

  // ---- theme: load once, persist on change, apply via data-theme on .app ----
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as ThemeName | null;
    if (saved) setTheme(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const tagTree = useMemo(() => buildTagTree(notes), [notes]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of LIBRARY_TYPES) {
      c[t] = notes.filter((n) => matchesFilter(n, { type: t }, flags)).length;
    }
    return c;
  }, [notes, flags]);

  const visibleNotes = useMemo(
    () =>
      notes
        .filter((n) => matchesFilter(n, filter, flags) && matchesQuery(n, query))
        .sort((a, b) => {
          const pinDiff = (flags.pinned.has(b.id) ? 1 : 0) - (flags.pinned.has(a.id) ? 1 : 0);
          if (pinDiff !== 0) return pinDiff;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }),
    [notes, filter, flags, query],
  );

  // Auto-select the first visible note once data arrives (wide-screen comfort).
  useEffect(() => {
    if (selectedId === null && visibleNotes.length > 0) {
      setSelectedId(visibleNotes[0].id);
    }
  }, [selectedId, visibleNotes]);

  // Keep the draft mirroring the selected note unless we're actively editing.
  // updated_at in deps re-syncs the rendered view right after a save.
  useEffect(() => {
    if (selectedNote && !editing) {
      setDraft({ title: selectedNote.title, content: selectedNote.content });
    }
  }, [selectedNote?.id, selectedNote?.updated_at, editing, selectedNote]);

  const openNote = useCallback((note: Note) => {
    setSelectedId(note.id);
    setEditing(false);
    setDraft({ title: note.title, content: note.content });
    setMobileView("editor");
  }, []);

  const onFilter = useCallback((f: Filter) => {
    setFilter(f);
    setDrawerOpen(false);
    setMobileView("list");
  }, []);

  const onChange = useCallback((patch: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const startEdit = useCallback(() => {
    if (selectedNote) {
      setDraft({ title: selectedNote.title, content: selectedNote.content });
      setEditing(true);
    }
  }, [selectedNote]);

  const saveDraft = useCallback(async () => {
    if (!selectedNote) return;
    await edit(selectedNote.id, { title: draft.title, content: draft.content });
    setEditing(false);
  }, [edit, selectedNote, draft]);

  const compose = useCallback(async () => {
    const created = await create({ title: "New Note", content: "" });
    if (created) {
      setFilter({ type: "all" });
      setSelectedId(created.id);
      setDraft({ title: created.title, content: created.content });
      setEditing(true);
      setMobileView("editor");
      setDrawerOpen(false);
    }
  }, [create]);

  const toggleFlag = useCallback((key: keyof FlagSets, id: number) => {
    setFlags((prev) => {
      const set = new Set(prev[key]);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, [key]: set };
    });
  }, []);

  const deleteForever = useCallback(
    async (id: number) => {
      await remove(id);
      setFlags((prev) => {
        const trashed = new Set(prev.trashed);
        trashed.delete(id);
        return { ...prev, trashed };
      });
      setSelectedId(null);
      setEditing(false);
    },
    [remove],
  );

  const inTrash = selectedNote ? flags.trashed.has(selectedNote.id) : false;

  const appClass = [
    "app",
    drawerOpen ? "drawer-open" : "",
    infoOpen && selectedNote ? "info-open" : "",
    mobileView === "editor" ? "view-editor" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={appClass} data-theme={theme}>
      <div className="scrim" onClick={() => setDrawerOpen(false)} />

      <Sidebar
        filter={filter}
        onFilter={onFilter}
        counts={counts}
        tagTree={tagTree}
        theme={theme}
        onTheme={setTheme}
      />

      <NoteList
        title={filterTitle(filter)}
        notes={visibleNotes}
        selectedId={selectedId}
        flags={flags}
        query={query}
        onQuery={setQuery}
        onSelect={openNote}
        onCompose={compose}
        onOpenDrawer={() => setDrawerOpen(true)}
      />

      <Editor
        note={selectedNote}
        editing={editing}
        draft={draft}
        flags={flags}
        inTrash={inTrash}
        onChange={onChange}
        onStartEdit={startEdit}
        onSave={saveDraft}
        onBack={() => setMobileView("list")}
        onToggleInfo={() => setInfoOpen((v) => !v)}
        onPin={() => selectedNote && toggleFlag("pinned", selectedNote.id)}
        onLock={() => selectedNote && toggleFlag("locked", selectedNote.id)}
        onArchive={() => selectedNote && toggleFlag("archived", selectedNote.id)}
        onTrash={() => selectedNote && toggleFlag("trashed", selectedNote.id)}
        onRestore={() => selectedNote && toggleFlag("trashed", selectedNote.id)}
        onDeleteForever={() => selectedNote && deleteForever(selectedNote.id)}
      />

      {infoOpen && selectedNote && (
        <InfoPanel note={selectedNote} onClose={() => setInfoOpen(false)} />
      )}
    </div>
  );
}
