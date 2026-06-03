import { type RefObject, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Menu, MenuHeader, MenuItem, MenuSep, SubMenu } from "@/components/Menu";
import type { Note } from "@/lib/notes";
import { extractTags } from "@/lib/markdown";
import { downloadText, stripTags } from "@/lib/download";
import type { Filter, FilterType, FlagSets, PreviewStyle, SortKey } from "@/lib/view";
import { filterTitle, relativeTime, snippet, splitEmoji } from "@/lib/view";
import type { IconName } from "@/components/icons";

interface NoteListProps {
  notes: Note[];
  selectedId: number | null;
  flags: FlagSets;
  query: string;
  filter: Filter;
  onFilter: (f: Filter) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  preview: PreviewStyle;
  onPreview: (p: PreviewStyle) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  onQuery: (q: string) => void;
  onSelect: (note: Note) => void;
  onCompose: () => void;
  onOpenDrawer: () => void;
  onPin: (note: Note) => void;
  onTrash: (note: Note) => void;
  keepTags: boolean;
}

// Fraction of the card width revealed when an action snaps open (the pin/trash
// button occupies this much of the right/left edge).
const ACTION_FRACTION = 0.25;

type Side = "pin" | "trash";

// A note card with iOS-Mail-style swipe actions. Swiping (pointer drag or a
// MacBook two-finger trackpad swipe) slides the card to *reveal* a button that
// snaps open at 25% — it does NOT perform the action. The action only fires
// when you then click the revealed button, which keeps a single swipe from ever
// affecting more than one note. Swipe left → reveal trash (right); swipe right →
// reveal pin (left). `openSide` is controlled by the parent so only one card is
// open at a time.
function SwipeCard({
  className,
  openSide,
  onReveal,
  onPin,
  onTrash,
  onOpenNote,
  children,
}: {
  className: string;
  openSide: Side | null;
  onReveal: (side: Side | null) => void;
  onPin: () => void;
  onTrash: () => void;
  onOpenNote: () => void;
  children: React.ReactNode;
}) {
  const cardRef = useRef<HTMLElement>(null);
  // Live offset (px) while a gesture is in progress; null when resting (the
  // resting position then comes from the open-pin/open-trash CSS class).
  const [drag, setDrag] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);
  const setDragV = (v: number | null) => {
    dragRef.current = v;
    setDrag(v);
  };

  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"none" | "h" | "v">("none");
  const moved = useRef(false);

  // Refs so the long-lived wheel listener always sees fresh values.
  const sideRef = useRef(openSide);
  const cb = useRef({ onReveal, onPin, onTrash });
  useEffect(() => {
    sideRef.current = openSide;
    cb.current = { onReveal, onPin, onTrash };
  });

  const actionW = () => (cardRef.current?.clientWidth ?? 320) * ACTION_FRACTION;
  const restOffset = (side: Side | null) =>
    side === "pin" ? actionW() : side === "trash" ? -actionW() : 0;
  const clamp = (x: number) => {
    const w = actionW();
    return Math.max(-w, Math.min(w, x));
  };
  // Decide where a finished gesture lands: open if dragged past half the reveal.
  const snap = (offset: number) => {
    const half = actionW() / 2;
    const side: Side | null = offset <= -half ? "trash" : offset >= half ? "pin" : null;
    setDragV(null);
    cb.current.onReveal(side);
  };

  // --- pointer drag (touch / mouse) ---
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    axis.current = "none";
    moved.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (axis.current === "v") return;
    const dX = e.clientX - startX.current;
    const dY = e.clientY - startY.current;
    if (axis.current === "none") {
      if (Math.abs(dX) > 8 && Math.abs(dX) > Math.abs(dY)) {
        axis.current = "h";
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic events have no active pointer — fine */
        }
      } else if (Math.abs(dY) > 8) {
        axis.current = "v"; // let the list scroll
        return;
      } else {
        return;
      }
    }
    moved.current = true;
    setDragV(clamp(restOffset(openSide) + dX));
  };
  const onPointerUp = () => {
    if (axis.current === "h" && dragRef.current !== null) snap(dragRef.current);
    axis.current = "none";
  };

  // --- trackpad two-finger swipe (wheel) ---
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    let acc = 0;
    let active = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical → list scroll
      e.preventDefault();
      e.stopPropagation(); // don't let NotesApp collapse the sidebar
      if (!active) {
        active = true;
        acc = restOffset(sideRef.current);
      }
      acc = clamp(acc - e.deltaX); // natural scroll: fingers-left (deltaX>0) → left
      setDragV(acc);
      clearTimeout(timer);
      timer = setTimeout(() => {
        active = false;
        snap(acc);
      }, 140);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClick = (e: React.MouseEvent) => {
    if (moved.current) {
      // a drag just happened — swallow the click so it neither opens nor closes
      e.preventDefault();
      e.stopPropagation();
      moved.current = false;
      return;
    }
    if (openSide) onReveal(null); // tap an open card to close it
    else onOpenNote();
  };

  const cls =
    className + (openSide === "pin" ? " open-pin" : openSide === "trash" ? " open-trash" : "");

  return (
    <div className="swipe-wrap">
      <button
        type="button"
        className="swipe-act pin"
        aria-label="Pin"
        onClick={() => {
          onPin();
          onReveal(null);
        }}
      >
        <Icon name="pin" width={20} height={20} />
      </button>
      <button
        type="button"
        className="swipe-act trash"
        aria-label="Move to Trash"
        onClick={() => {
          onTrash();
          onReveal(null);
        }}
      >
        <Icon name="trash" width={20} height={20} />
      </button>
      <article
        ref={cardRef}
        className={cls}
        style={drag !== null ? { transform: `translateX(${drag}px)`, transition: "none" } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClick}
      >
        {children}
      </article>
    </div>
  );
}

// The library switcher items, with their ⌥⌘ shortcuts (mirrors NotesApp's
// keyboard handler).
const LIBRARY: { type: FilterType; label: string; icon: IconName; key: string }[] = [
  { type: "all", label: "Notes", icon: "doc", key: "⌥⌘1" },
  { type: "untagged", label: "Untagged", icon: "inbox", key: "⌥⌘2" },
  { type: "todo", label: "Todo", icon: "todo", key: "⌥⌘3" },
  { type: "today", label: "Today", icon: "today", key: "⌥⌘4" },
  { type: "locked", label: "Locked", icon: "lock", key: "⌥⌘5" },
  { type: "pinned", label: "Pinned", icon: "pin", key: "⌥⌘6" },
  { type: "archive", label: "Archive", icon: "archive", key: "⌥⌘9" },
  { type: "trash", label: "Trash", icon: "trash", key: "⌥⌘0" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "modified", label: "Date Modified" },
  { key: "created", label: "Date Created" },
  { key: "title", label: "Title" },
];

const PREVIEWS: { key: PreviewStyle; label: string }[] = [
  { key: "small", label: "Small" },
  { key: "medium", label: "Medium" },
  { key: "large", label: "Large" },
];

export function NoteList({
  notes,
  selectedId,
  flags,
  query,
  filter,
  onFilter,
  sort,
  onSort,
  preview,
  onPreview,
  searchRef,
  onQuery,
  onSelect,
  onCompose,
  onOpenDrawer,
  onPin,
  onTrash,
  keepTags,
}: NoteListProps) {
  const title = filterTitle(filter);
  // Which card currently has its swipe actions revealed (one at a time).
  const [open, setOpen] = useState<{ id: number; side: Side } | null>(null);

  const exportLibrary = () => {
    // One markdown file with every note in the current view, separated by ---.
    const body = notes
      .map((n) => {
        const content = keepTags ? n.content : stripTags(n.content);
        return `# ${n.title || "Untitled"}\n\n${content}`.trim();
      })
      .join("\n\n---\n\n");
    const name = title.replace(/[^\w]+/g, "-").toLowerCase() || "notes";
    downloadText(`${name}.md`, body || "");
  };

  return (
    <section className="notelist">
      <div className="listtop">
        <button className="only-narrow" onClick={onOpenDrawer} aria-label="Open menu">
          <Icon name="menu" />
        </button>

        <Menu
          label="Switch library"
          triggerClass="libpick"
          align="left"
          width={236}
          trigger={
            <>
              <span className="t">{title}</span>
              <Icon name="chevD" className="lchev" />
            </>
          }
        >
          <MenuHeader>
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </MenuHeader>
          <SubMenu icon="sort" label="Sorting">
            {SORTS.map((s) => (
              <MenuItem key={s.key} checked={sort === s.key} onSelect={() => onSort(s.key)}>
                {s.label}
              </MenuItem>
            ))}
          </SubMenu>
          <SubMenu icon="rows" label="Preview Style">
            {PREVIEWS.map((p) => (
              <MenuItem key={p.key} checked={preview === p.key} onSelect={() => onPreview(p.key)}>
                {p.label}
              </MenuItem>
            ))}
          </SubMenu>
          <MenuItem icon="export" onSelect={exportLibrary}>
            Export…
          </MenuItem>
          <MenuSep />
          {LIBRARY.map((row) => (
            <MenuItem
              key={row.type}
              icon={row.icon}
              shortcut={row.key}
              current={filter.type === row.type}
              onSelect={() => onFilter({ type: row.type })}
            >
              {row.label}
            </MenuItem>
          ))}
        </Menu>

        <button className="only-wide" onClick={onCompose} aria-label="New note">
          <Icon name="edit" />
        </button>
      </div>

      <div className="psearch">
        <Icon name="search" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search notes"
        />
      </div>

      <div className="listscroll" data-preview={preview}>
        {notes.length === 0 ? (
          <div className="listempty">No notes here yet.</div>
        ) : (
          notes.map((note) => {
            const [emoji, rest] = splitEmoji(note.title || "");
            const tags = extractTags(note.content).slice(0, 3);
            const pinned = flags.pinned.has(note.id);
            const locked = flags.locked.has(note.id);
            const previewText = snippet(note.content);
            return (
              <SwipeCard
                key={note.id}
                className={`mcard${note.id === selectedId ? " sel" : ""}${pinned ? " pinned" : ""}`}
                openSide={open?.id === note.id ? open.side : null}
                onReveal={(side) => setOpen(side ? { id: note.id, side } : null)}
                onPin={() => onPin(note)}
                onTrash={() => onTrash(note)}
                onOpenNote={() => {
                  setOpen(null);
                  onSelect(note);
                }}
              >
                <div className="mt">
                  {emoji ? `${emoji} ` : ""}
                  {rest || "Untitled"}
                </div>
                {previewText && <div className="ms">{previewText}</div>}
                <div className="mm">
                  {pinned && (
                    <span className="pin">
                      <Icon name="pin" width={12} height={12} />
                    </span>
                  )}
                  {locked && <Icon name="lock" width={12} height={12} />}
                  <span>{relativeTime(note.updated_at)}</span>
                </div>
                {tags.length > 0 && (
                  <div className="chips">
                    {tags.map((tag) => (
                      <span className="tagchip" key={tag}>
                        <span className="h">#</span>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </SwipeCard>
            );
          })
        )}
      </div>

      <button className="fab" onClick={onCompose} aria-label="New note">
        <Icon name="plus" />
      </button>
    </section>
  );
}
