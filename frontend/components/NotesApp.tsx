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
  // Side-panel collapse level (wide layout): 0 = sidebar + list shown,
  // 1 = sidebar slid out, 2 = sidebar + list slid out (editor full width).
  const [collapsed, setCollapsed] = useState(0);

  // ---- theme: load once, persist on change, apply via data-theme on .app ----
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as ThemeName | null;
    if (saved) setTheme(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // ---- two-finger horizontal swipe collapses/expands the side panels ----
  // Swipe left (fingers left) steps panels closed from the left edge; swipe
  // right reopens them one at a time. Wide layout only. One physical swipe =
  // one step: after a step we "lock" until an idle gap separates the next.
  useEffect(() => {
    let acc = 0;
    let lastT = 0;
    let locked = false;
    const STEP = 60; // accumulated |deltaX| px to trigger one step
    const IDLE = 160; // ms gap that ends a gesture

    // Walk up from the event target; if a horizontally-scrollable ancestor can
    // still scroll in the swipe direction, let it scroll instead of collapsing.
    const contentCanScroll = (target: EventTarget | null, dir: number): boolean => {
      let node = target instanceof Element ? target : null;
      while (node && node !== document.body) {
        if (node.scrollWidth > node.clientWidth + 1) {
          const ox = getComputedStyle(node).overflowX;
          if (ox === "auto" || ox === "scroll") {
            const atStart = node.scrollLeft <= 0;
            const atEnd = node.scrollLeft + node.clientWidth >= node.scrollWidth - 1;
            if (dir > 0 && !atEnd) return true;
            if (dir < 0 && !atStart) return true;
          }
        }
        node = node.parentElement;
      }
      return false;
    };

    const onWheel = (e: WheelEvent) => {
      if (!window.matchMedia("(min-width: 861px)").matches) return; // three-pane only
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical scroll — ignore
      if (contentCanScroll(e.target, e.deltaX)) return; // let content scroll
      e.preventDefault(); // it's a panel gesture — also blocks history back/forward swipe

      const now = Date.now();
      if (now - lastT > IDLE) {
        locked = false; // a new gesture started
        acc = 0;
      }
      lastT = now;
      if (locked) return;

      acc += e.deltaX;
      // Natural scrolling: fingers-left → deltaX > 0 (collapse); fingers-right → expand.
      if (acc > STEP) {
        setCollapsed((c) => Math.min(2, c + 1));
        locked = true;
        acc = 0;
      } else if (acc < -STEP) {
        setCollapsed((c) => Math.max(0, c - 1));
        locked = true;
        acc = 0;
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

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
    collapsed === 1 ? "collapse-1" : collapsed === 2 ? "collapse-2" : "",
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
