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

// Distance (px) a card must travel before a swipe commits its action.
const SWIPE_THRESHOLD = 80;

// A note card you can swipe horizontally: left = pin, right = move to trash.
// Works with both a pointer drag (touch / mouse) and a MacBook two-finger
// trackpad swipe (wheel events). Vertical gestures fall through to the list
// scroll, and a gesture that doesn't pass the threshold springs back.
function SwipeCard({
  className,
  onOpen,
  onSwipeLeft,
  onSwipeRight,
  children,
}: {
  className: string;
  onOpen: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  children: React.ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const dxRef = useRef(0);
  const axis = useRef<"none" | "h" | "v">("none");
  const swiped = useRef(false);
  // Latest action callbacks, read by the long-lived wheel listener.
  const handlers = useRef({ onSwipeLeft, onSwipeRight });
  useEffect(() => {
    handlers.current = { onSwipeLeft, onSwipeRight };
  });

  const move = (x: number) => {
    dxRef.current = x;
    setDx(x);
  };

  // Trackpad two-finger swipe → wheel events. Attached non-passively so we can
  // preventDefault (stop horizontal scroll) and stopPropagation (so NotesApp's
  // window wheel listener doesn't also collapse the sidebar). Commits the action
  // as soon as the accumulated horizontal delta passes the threshold.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    let acc = 0;
    let committed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reset = () => {
      acc = 0;
      committed = false;
      setAnimating(true);
      move(0);
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) {
        if (acc !== 0 && !committed) reset(); // vertical scroll — abandon swipe
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      clearTimeout(timer);
      timer = setTimeout(reset, 160); // gesture ends after a quiet gap
      if (committed) return;
      acc -= e.deltaX; // natural scroll: fingers-left (deltaX>0) → card moves left
      if (Math.abs(acc) >= SWIPE_THRESHOLD) {
        committed = true;
        (acc < 0 ? handlers.current.onSwipeLeft : handlers.current.onSwipeRight)();
        setAnimating(true);
        move(0);
        return;
      }
      setAnimating(false);
      move(Math.max(-140, Math.min(140, acc)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      clearTimeout(timer);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY };
    axis.current = "none";
    swiped.current = false;
    setAnimating(false);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dX = e.clientX - start.current.x;
    const dY = e.clientY - start.current.y;
    if (axis.current === "none") {
      if (Math.abs(dX) > 10 && Math.abs(dX) > Math.abs(dY)) {
        axis.current = "h";
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* no active pointer (e.g. synthetic events) — fine */
        }
      } else if (Math.abs(dY) > 10) {
        axis.current = "v"; // let the list scroll
      }
    }
    if (axis.current === "h") move(dX);
  };

  const finish = () => {
    if (!start.current) return;
    const d = dxRef.current;
    if (axis.current === "h" && Math.abs(d) >= SWIPE_THRESHOLD) {
      swiped.current = true;
      if (d < 0) onSwipeLeft();
      else onSwipeRight();
    }
    start.current = null;
    axis.current = "none";
    setAnimating(true);
    move(0);
  };

  const onClick = (e: React.MouseEvent) => {
    // Suppress the click that follows a committed swipe so it doesn't open.
    if (swiped.current) {
      e.preventDefault();
      e.stopPropagation();
      swiped.current = false;
      return;
    }
    onOpen();
  };

  return (
    <div className="swipe-wrap">
      {dx < 0 && (
        <div className="swipe-act pin">
          <Icon name="pin" width={18} height={18} />
        </div>
      )}
      {dx > 0 && (
        <div className="swipe-act trash">
          <Icon name="trash" width={18} height={18} />
        </div>
      )}
      <article
        ref={cardRef}
        className={className}
        style={{ transform: `translateX(${dx}px)`, transition: animating ? "transform .2s ease" : "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
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
                onOpen={() => onSelect(note)}
                onSwipeLeft={() => onPin(note)}
                onSwipeRight={() => onTrash(note)}
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
