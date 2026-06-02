"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNotes } from "@/hooks/useNotes";
import type { Note } from "@/lib/notes";
import { buildTagTree } from "@/lib/tags";
import {
  emptyFlags,
  matchesFilter,
  matchesQuery,
  sortNotes,
  type Filter,
  type FilterType,
  type FlagSets,
  type PreviewStyle,
  type SortKey,
} from "@/lib/view";
import { Sidebar, type ThemeName } from "@/components/Sidebar";
import { NoteList } from "@/components/NoteList";
import { Editor, type Draft } from "@/components/Editor";
import { InfoPanel } from "@/components/InfoPanel";
import { Settings } from "@/components/Settings";
import { useSettings } from "@/hooks/useSettings";
import { settingsToCssVars } from "@/lib/settings";
import type { CSSProperties } from "react";

const THEME_KEY = "notes-theme";
const LIBRARY_TYPES = [
  "all",
  "untagged",
  "todo",
  "today",
  "locked",
  "pinned",
  "archive",
  "trash",
] as const;

// ⌥⌘<digit> → library filter (shown as hints in the "Notes ⌄" menu).
const SHORTCUTS: Record<string, FilterType> = {
  "1": "all",
  "2": "untagged",
  "3": "todo",
  "4": "today",
  "5": "locked",
  "6": "pinned",
  "9": "archive",
  "0": "trash",
};

export default function NotesApp() {
  const { notes, create, edit, remove } = useNotes();
  const { settings, update: updateSettings, resetTypography } = useSettings();

  const [theme, setTheme] = useState<ThemeName>("light");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>({ type: "all" });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>({ title: "", content: "" });
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");
  const [flags, setFlags] = useState<FlagSets>(emptyFlags);
  const [sort, setSort] = useState<SortKey>("modified");
  const [preview, setPreview] = useState<PreviewStyle>("multi");
  const searchRef = useRef<HTMLInputElement>(null);
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
  // one step.
  //
  // The tricky part is separating swipes: a trackpad keeps firing *inertial*
  // (momentum) wheel events for up to ~1s after the finger lifts, so we can't
  // just wait for an idle gap to re-arm — that gap never comes between two
  // quick swipes, and the second swipe gets swallowed. Instead, after a step we
  // stay locked through the momentum tail (whose |deltaX| only ever decays) and
  // re-arm the instant that tail dies out (QUIET) or a fresh flick appears (a
  // sharp rising edge in |deltaX|). That lets you collapse/expand both panels
  // in quick succession.
  //
  // The listener is PASSIVE on purpose: a non-passive wheel listener forces the
  // browser to run JS before every scroll frame and disables off-thread
  // scrolling, which makes the note list lag. We therefore never call
  // preventDefault here; the macOS history back/forward swipe is suppressed via
  // `overscroll-behavior-x: none` (see globals.css) instead.
  useEffect(() => {
    let acc = 0;
    let lastT = 0;
    let prevAbs = 0;
    let locked = false;
    const STEP = 60; // accumulated |deltaX| px to trigger one step
    const IDLE = 140; // ms with no wheel events at all → gesture ended
    const QUIET = 4; // |deltaX| at/below this ≈ the momentum tail has died out
    const REARM = 1.6; // |deltaX| jumping this far above the tail = a new flick
    // Cache the media query once instead of allocating a MediaQueryList per event.
    const wide = window.matchMedia("(min-width: 861px)");

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
      if (!wide.matches) return; // three-pane only
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical scroll — ignore (fast path)
      if (contentCanScroll(e.target, e.deltaX)) return; // let content scroll

      const now = Date.now();
      const abs = Math.abs(e.deltaX);

      // A genuine pause (no events at all for IDLE ms) ends the gesture.
      if (now - lastT > IDLE) {
        locked = false;
        acc = 0;
        prevAbs = 0;
      }
      lastT = now;

      // While locked (riding out the previous swipe's momentum), re-arm only
      // when that tail has gone quiet or the user clearly started a new flick —
      // never while |deltaX| is still high and decaying, so one swipe can't
      // double-step.
      if (locked && (abs <= QUIET || (abs > 12 && abs > prevAbs * REARM))) {
        locked = false;
        acc = 0;
      }
      prevAbs = abs;
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

    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  // ⌥⌘<digit> jumps to a library (matches the hints in the "Notes ⌄" menu).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey || !e.altKey) return;
      const type = SHORTCUTS[e.key];
      if (!type) return;
      e.preventDefault();
      setFilter({ type });
      setMobileView("list");
      setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
      sortNotes(
        notes.filter((n) => matchesFilter(n, filter, flags) && matchesQuery(n, query)),
        sort,
        flags,
      ),
    [notes, filter, flags, query, sort],
  );

  // Auto-select the first visible note once data arrives (wide-screen comfort).
  useEffect(() => {
    if (selectedId === null && visibleNotes.length > 0) {
      setSelectedId(visibleNotes[0].id);
    }
  }, [selectedId, visibleNotes]);

  // Reset the editing buffer when we switch to a different note. We deliberately
  // do NOT re-sync on updated_at: the live editor always holds the freshest
  // text, and re-syncing after our own autosave would clobber in-flight typing.
  useEffect(() => {
    if (selectedNote) setDraft({ title: selectedNote.title, content: selectedNote.content });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNote?.id]);

  // Latest draft / note kept in refs so save() can flush without being rebuilt.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const selectedRef = useRef(selectedNote);
  selectedRef.current = selectedNote;

  // Persist the current draft if it differs from the stored note. The no-op
  // guard means moving the caret around (no text change) never hits the API.
  const save = useCallback(async () => {
    const n = selectedRef.current;
    const d = draftRef.current;
    if (!n) return;
    if (d.title === n.title && d.content === n.content) return;
    await edit(n.id, { title: d.title, content: d.content });
  }, [edit]);

  // Debounced autosave — there is no "Done" button anymore, so we persist a
  // short moment after the user stops typing.
  useEffect(() => {
    if (!selectedNote) return;
    if (draft.title === selectedNote.title && draft.content === selectedNote.content) return;
    const t = setTimeout(() => void save(), 700);
    return () => clearTimeout(t);
  }, [draft, selectedNote, save]);

  const openNote = useCallback(
    (note: Note) => {
      void save(); // flush pending edits on the note we're leaving
      setSelectedId(note.id);
      setMobileView("editor");
    },
    [save],
  );

  const onFilter = useCallback((f: Filter) => {
    setFilter(f);
    setDrawerOpen(false);
    setMobileView("list");
  }, []);

  const onChange = useCallback((patch: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const compose = useCallback(async () => {
    void save();
    // "Create new notes with" (General settings): seed an empty heading line or
    // start with plain body text.
    const content = settings.newNoteWith === "heading" ? "# " : "";
    const created = await create({ title: "New Note", content });
    if (created) {
      setFilter({ type: "all" });
      setSelectedId(created.id);
      setMobileView("editor");
      setDrawerOpen(false);
    }
  }, [create, save, settings.newNoteWith]);

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
    <div className={appClass} data-theme={theme} style={settingsToCssVars(settings) as CSSProperties}>
      <div className="scrim" onClick={() => setDrawerOpen(false)} />

      <Sidebar
        filter={filter}
        onFilter={onFilter}
        counts={counts}
        tagTree={tagTree}
        theme={theme}
        onTheme={setTheme}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <NoteList
        notes={visibleNotes}
        selectedId={selectedId}
        flags={flags}
        query={query}
        filter={filter}
        onFilter={onFilter}
        sort={sort}
        onSort={setSort}
        preview={preview}
        onPreview={setPreview}
        searchRef={searchRef}
        onQuery={setQuery}
        onSelect={openNote}
        onCompose={compose}
        onOpenDrawer={() => setDrawerOpen(true)}
        keepTags={settings.keepTags}
      />

      <Editor
        note={selectedNote}
        draft={draft}
        flags={flags}
        inTrash={inTrash}
        onChange={onChange}
        onBack={() => setMobileView("list")}
        onToggleInfo={() => setInfoOpen((v) => !v)}
        onSearch={() => {
          setMobileView("list");
          // Focus now (wide layout) and again after layout settles (narrow,
          // where switching to the list view re-mounts the search field).
          searchRef.current?.focus();
          requestAnimationFrame(() => searchRef.current?.focus());
        }}
        onPin={() => selectedNote && toggleFlag("pinned", selectedNote.id)}
        onLock={() => selectedNote && toggleFlag("locked", selectedNote.id)}
        onArchive={() => selectedNote && toggleFlag("archived", selectedNote.id)}
        onTrash={() => selectedNote && toggleFlag("trashed", selectedNote.id)}
        onRestore={() => selectedNote && toggleFlag("trashed", selectedNote.id)}
        onDeleteForever={() => selectedNote && deleteForever(selectedNote.id)}
        keepTags={settings.keepTags}
      />

      {infoOpen && selectedNote && (
        <InfoPanel note={selectedNote} onClose={() => setInfoOpen(false)} />
      )}

      {settingsOpen && (
        <Settings
          settings={settings}
          onChange={updateSettings}
          onResetTypography={resetTypography}
          theme={theme}
          onTheme={setTheme}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
