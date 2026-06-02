import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Menu, MenuItem, MenuSep, SubMenu } from "@/components/Menu";
import type { Note } from "@/lib/notes";
import { extractTags, renderMarkdown } from "@/lib/markdown";
import { findBlock, segmentBlocks } from "@/lib/segments";
import { downloadText, safeFilename } from "@/lib/download";
import type { FlagSets } from "@/lib/view";

export interface Draft {
  title: string;
  content: string;
}

interface EditorProps {
  note: Note | null;
  draft: Draft;
  flags: FlagSets;
  inTrash: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onBack: () => void;
  onToggleInfo: () => void;
  onSearch: () => void;
  onPin: () => void;
  onLock: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onDeleteForever: () => void;
}

// Where to drop the caret when a block becomes active.
type Caret = "start" | "end";

export function Editor({
  note,
  draft,
  flags,
  inTrash,
  onChange,
  onBack,
  onToggleInfo,
  onSearch,
  onPin,
  onLock,
  onArchive,
  onTrash,
  onRestore,
  onDeleteForever,
}: EditorProps) {
  // The block currently shown as raw source (line range), or null when the
  // whole note is rendered. Tracked by line range so edits can be spliced back.
  const [active, setActive] = useState<{ start: number; end: number } | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const pendingCaret = useRef<Caret>("end");

  const readOnly = inTrash;
  const lines = draft.content.replace(/\r\n/g, "\n").split("\n");

  // Reset to fully-rendered whenever we switch notes; auto-open a genuinely
  // empty note (e.g. just composed) so the caret is ready to type. We key off
  // the persisted note content, not the draft, which may not have synced yet.
  useEffect(() => {
    if (note && note.content.trim() === "" && !readOnly) {
      setActive({ start: 0, end: 0 });
      pendingCaret.current = "end";
    } else {
      setActive(null);
    }
    // Only re-run on note identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  // Focus the raw textarea and place the caret when a block activates.
  useLayoutEffect(() => {
    if (!active) return;
    const el = areaRef.current;
    if (!el) return;
    el.focus();
    const pos = pendingCaret.current === "start" ? 0 : el.value.length;
    el.setSelectionRange(pos, pos);
    autoSize(el);
  }, [active]);

  // Click outside the live area (or Escape) re-renders the active line.
  useEffect(() => {
    if (!active) return;
    const onDocDown = (e: MouseEvent) => {
      const target = e.target as Node;
      // The formatting toolbar sits outside the live area but must not blur it.
      if (target instanceof Element && target.closest(".edtoolbar")) return;
      if (liveRef.current && !liveRef.current.contains(target)) {
        setActive(null);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [active]);

  const blocks = segmentBlocks(draft.content);
  const activeText = active ? lines.slice(active.start, active.end + 1).join("\n") : "";

  // Splice the edited block text back into the full content.
  const setActiveText = useCallback(
    (value: string) => {
      if (!active) return;
      const all = draft.content.replace(/\r\n/g, "\n").split("\n");
      const before = all.slice(0, active.start);
      const after = all.slice(active.end + 1);
      const vLines = value.split("\n");
      setActive({ start: active.start, end: active.start + vLines.length - 1 });
      onChange({ content: [...before, ...vLines, ...after].join("\n") });
    },
    [active, draft.content, onChange],
  );

  const activateBlock = (start: number, end: number, caret: Caret) => {
    if (readOnly) return;
    pendingCaret.current = caret;
    setActive({ start, end });
  };

  // Move from the active block to a neighbour (arrow-key navigation).
  const step = (dir: -1 | 1) => {
    if (!active) return;
    const list = segmentBlocks(draft.content);
    const here = findBlock(list, active.start);
    if (!here) return;
    const next = list[here.index + dir];
    if (next) activateBlock(next.start, next.end, dir === 1 ? "start" : "end");
  };

  const onAreaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    if (e.key === "Escape") {
      e.preventDefault();
      setActive(null);
      return;
    }
    if (e.key === "ArrowUp" && el.selectionStart === 0 && el.selectionEnd === 0) {
      e.preventDefault();
      step(-1);
    } else if (
      e.key === "ArrowDown" &&
      el.selectionStart === el.value.length &&
      el.selectionEnd === el.value.length
    ) {
      e.preventDefault();
      step(1);
    }
  };

  // Formatting pill — operates on the active raw textarea.
  const wrap = (before: string, after: string = before) => {
    const el = areaRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const next = value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e);
    setActiveText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, e + before.length);
    });
  };

  const prefixLine = (prefix: string) => {
    const el = areaRef.current;
    if (!el) return;
    const { selectionStart: s, value } = el;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    setActiveText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + prefix.length, s + prefix.length);
    });
  };

  if (!note) {
    return (
      <section className="editorpane">
        <div className="editempty">Select a note, or create a new one.</div>
      </section>
    );
  }

  const tags = extractTags(draft.content);
  const title = draft.title || note.title || "Untitled";

  // ---- more-menu actions ----
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
  };
  // Strip markdown to readable plain text (keeps line breaks, unlike snippet()).
  const toPlainText = (md: string): string =>
    md
      .replace(/```\w*\n?([\s\S]*?)```/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*]\s+\[[ xX]\]\s+/gm, "")
      .replace(/^\s*[-*]\s+/gm, "• ")
      .replace(/^\s*>\s?/gm, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/~~([^~]+)~~/g, "$1")
      .replace(/==([^=]+)==/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  const exportNote = () =>
    downloadText(safeFilename(title, "md"), `# ${title}\n\n${draft.content}`);
  const copyLink = () => copy(`${location.origin}/?note=${note.id}`);

  return (
    <section className="editorpane">
      <div className="edittop">
        <button className="only-narrow" onClick={onBack} aria-label="Back to list">
          <Icon name="back" />
        </button>
        <span className="biu">
          B <i>I</i> <u>U</u>
        </span>
        <span className="sp" />
        <button onClick={onToggleInfo} aria-label="Note info">
          <Icon name="info" />
        </button>
        <Menu label="More actions" align="right" width={214} trigger={<Icon name="more" />}>
          <MenuItem icon="search" onSelect={onSearch}>
            Search
          </MenuItem>
          <MenuItem icon="stats" onSelect={onToggleInfo}>
            Toggle Statistics
          </MenuItem>
          <MenuSep />
          <MenuItem icon="export" onSelect={exportNote}>
            Export…
          </MenuItem>
          <SubMenu icon="copy" label="Copy As">
            <MenuItem onSelect={() => copy(draft.content)}>Markdown</MenuItem>
            <MenuItem onSelect={() => copy(toPlainText(draft.content))}>Plain Text</MenuItem>
            <MenuItem onSelect={() => copy(renderMarkdown(draft.content))}>HTML</MenuItem>
          </SubMenu>
          <MenuItem icon="link" onSelect={copyLink}>
            Copy Link
          </MenuItem>
          <MenuSep />
          {inTrash ? (
            <>
              <MenuItem icon="archive" onSelect={onRestore}>
                Restore
              </MenuItem>
              <MenuItem icon="trash" danger onSelect={onDeleteForever}>
                Delete Forever
              </MenuItem>
            </>
          ) : (
            <>
              <MenuItem icon="pin" onSelect={onPin}>
                {flags.pinned.has(note.id) ? "Unpin" : "Pin"}
              </MenuItem>
              <MenuItem icon={flags.locked.has(note.id) ? "unlock" : "lock"} onSelect={onLock}>
                {flags.locked.has(note.id) ? "Unlock" : "Lock"}
              </MenuItem>
              <MenuItem icon="archive" onSelect={onArchive}>
                {flags.archived.has(note.id) ? "Unarchive" : "Archive"}
              </MenuItem>
              <MenuItem icon="trash" danger onSelect={onTrash}>
                Move to Trash
              </MenuItem>
            </>
          )}
        </Menu>
      </div>

      <div className="editscroll">
        <div className="doc mac live" ref={liveRef}>
          <input
            className="livetitle"
            value={draft.title}
            onChange={(e) => onChange({ title: e.target.value })}
            onMouseDown={() => setActive(null)}
            placeholder="Title"
            readOnly={readOnly}
          />
          {tags.length > 0 && (
            <div className="tagrow">
              {tags.map((tag) => (
                <span className="tagchip" key={tag}>
                  <span className="h">#</span>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {blocks.map((b) => {
            const isActive = active != null && active.start === b.start;
            if (isActive) {
              return (
                <textarea
                  key={`edit-${b.start}`}
                  ref={areaRef}
                  className="liveinput"
                  rows={1}
                  value={activeText}
                  onChange={(e) => {
                    setActiveText(e.target.value);
                    autoSize(e.target);
                  }}
                  onKeyDown={onAreaKeyDown}
                />
              );
            }
            const src = lines.slice(b.start, b.end + 1).join("\n");
            const blank = src.trim() === "";
            return (
              <div
                key={`view-${b.start}`}
                className={`liveblock${blank ? " blank" : ""}`}
                onMouseDown={(e) => {
                  if (readOnly) return;
                  e.preventDefault();
                  activateBlock(b.start, b.end, "end");
                }}
                dangerouslySetInnerHTML={blank ? undefined : { __html: renderMarkdown(src) }}
              />
            );
          })}
        </div>
      </div>

      {!readOnly && (
        <div className="edtoolbar">
          {/* preventDefault keeps the active textarea's focus + selection so the
              formatting buttons can act on it */}
          <div className="fmtpill" onMouseDown={(e) => e.preventDefault()}>
            <button onClick={() => prefixLine("# ")}>H</button>
            <span className="sep" />
            <button onClick={() => wrap("**")}>B</button>
            <button className="serifI" onClick={() => wrap("*")}>
              I
            </button>
            <button onClick={() => wrap("~~")}>S</button>
            <button onClick={() => wrap("==")}>
              <span className="mi hl" />
            </button>
            <span className="sep" />
            <button onClick={() => prefixLine("- ")}>
              <span className="mi list">
                <i />
                <i />
                <i />
              </span>
            </button>
            <button onClick={() => prefixLine("- [ ] ")}>
              <span className="mi box" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// Grow a textarea to fit its content (no inner scrollbar).
function autoSize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
