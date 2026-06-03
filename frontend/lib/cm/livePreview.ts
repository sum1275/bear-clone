// Bear-style live preview for the markdown editor.
//
// The document buffer is always the raw markdown; this StateField only changes
// how it is *displayed*. It walks the Lezer syntax tree and emits decorations
// that:
//   - hide block syntax always (heading #, quote >, list markers, code fences
//     when the caret is elsewhere) and swap in widgets (checkbox, bullet, table);
//   - reveal inline delimiters (**, *, ~~, ==, `) only when the caret is inside
//     that exact span — so "many" shows `**` only while you're editing it.
//
// A StateField (not a ViewPlugin) is required because some decorations cross
// line boundaries (table block widget, collapsing fenced-code fence lines),
// which view plugins are not allowed to produce. It also recomputes on every
// selection change, which is exactly what the caret-aware reveal needs.

import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import {
  type EditorState,
  type Extension,
  type Range,
  StateField,
} from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";
import { BulletWidget, CheckboxWidget, HrWidget, TableWidget } from "./widgets";

const HEADING_CLASS: Record<string, string> = {
  ATXHeading1: "cm-h1",
  ATXHeading2: "cm-h2",
  ATXHeading3: "cm-h3",
  ATXHeading4: "cm-h3",
  ATXHeading5: "cm-h3",
  ATXHeading6: "cm-h3",
};

// Inline nodes that get a styling mark applied across their whole range.
const INLINE_CLASS: Record<string, string> = {
  StrongEmphasis: "cm-strong",
  Emphasis: "cm-em",
  Strikethrough: "cm-strike",
  Highlight: "cm-mark",
  InlineCode: "cm-inline-code",
  Hashtag: "cm-hash",
};

// Delimiter nodes hidden unless the caret is within their parent inline span.
const REVEAL_MARK = new Set(["EmphasisMark", "StrikethroughMark", "HighlightMark", "CodeMark"]);

const hide = Decoration.replace({});

interface LiveValue {
  decorations: DecorationSet;
  atomic: DecorationSet;
}

function build(state: EditorState): LiveValue {
  const deco: Range<Decoration>[] = [];
  const atomic: Range<Decoration>[] = [];
  const doc = state.doc;
  const sel = state.selection;
  const touch = (from: number, to: number) => sel.ranges.some((r) => r.from <= to && r.to >= from);

  const hideRange = (from: number, to: number) => {
    if (to <= from) return;
    deco.push(hide.range(from, to));
    atomic.push(hide.range(from, to));
  };
  const lineClass = (pos: number, cls: string) => {
    deco.push(Decoration.line({ class: cls }).range(doc.lineAt(pos).from));
  };

  // Force a full parse so decorations cover the whole (small) note, not just the
  // prefix CM has parsed so far on first render.
  const tree = ensureSyntaxTree(state, doc.length, 5000) ?? syntaxTree(state);
  tree.iterate({
    enter: (node) => {
      const name = node.name;

      if (HEADING_CLASS[name]) {
        lineClass(node.from, HEADING_CLASS[name]);
        return;
      }
      if (name === "HeaderMark") {
        const parent = node.node.parent;
        if (parent && parent.name.startsWith("ATXHeading")) {
          let end = node.to;
          if (doc.sliceString(end, end + 1) === " ") end++;
          hideRange(node.from, end);
        }
        return;
      }

      if (name === "Blockquote") {
        for (let p = node.from; p <= node.to; ) {
          const line = doc.lineAt(p);
          deco.push(Decoration.line({ class: "cm-quote" }).range(line.from));
          if (line.to + 1 > node.to) break;
          p = line.to + 1;
        }
        return;
      }
      if (name === "QuoteMark") {
        let end = node.to;
        if (doc.sliceString(end, end + 1) === " ") end++;
        hideRange(node.from, end);
        return;
      }

      if (name === "HorizontalRule") {
        const line = doc.lineAt(node.from);
        if (!touch(line.from, line.to)) {
          deco.push(Decoration.replace({ widget: new HrWidget(), block: true }).range(line.from, line.to));
          atomic.push(hide.range(line.from, line.to));
        }
        return;
      }

      if (name === "Table") {
        const first = doc.lineAt(node.from);
        const last = doc.lineAt(Math.min(node.to, doc.length));
        const src = doc.sliceString(first.from, last.to);
        deco.push(
          Decoration.replace({ widget: new TableWidget(src), block: true }).range(first.from, last.to),
        );
        atomic.push(hide.range(first.from, last.to));
        return false; // render-only; skip children
      }

      if (name === "FencedCode") {
        buildFence(node.node, doc, touch(node.from, node.to), deco, hideRange);
        return false;
      }

      if (name === "Task") {
        const marker = node.node.getChild("TaskMarker");
        if (marker) {
          const listMark = node.node.parent?.getChild("ListMark") ?? null;
          const checked = /x/i.test(doc.sliceString(marker.from, marker.to));
          const start = listMark ? listMark.from : marker.from;
          const end = marker.to; // keep the trailing space as the gap to the text
          deco.push(
            Decoration.replace({ widget: new CheckboxWidget(checked, marker.from + 1) }).range(start, end),
          );
          atomic.push(hide.range(start, end));
          if (checked) {
            const line = doc.lineAt(node.from);
            if (end < line.to) deco.push(Decoration.mark({ class: "cm-task-done" }).range(end, line.to));
          }
        }
        return; // continue into the text for inline styling
      }

      if (name === "ListMark") {
        if (node.node.parent?.getChild("Task")) return; // handled by Task
        const ch = doc.sliceString(node.from, node.from + 1);
        if (ch === "-" || ch === "*" || ch === "+") {
          deco.push(Decoration.replace({ widget: new BulletWidget() }).range(node.from, node.to));
          atomic.push(hide.range(node.from, node.to));
        } else {
          deco.push(Decoration.mark({ class: "cm-ol-mark" }).range(node.from, node.to));
        }
        return;
      }

      if (name === "Wikilink") {
        deco.push(Decoration.mark({ class: "cm-wikilink" }).range(node.from, node.to));
        if (!touch(node.from, node.to)) {
          hideRange(node.from, node.from + 2);
          hideRange(node.to - 2, node.to);
        }
        return;
      }

      if (INLINE_CLASS[name]) {
        deco.push(Decoration.mark({ class: INLINE_CLASS[name] }).range(node.from, node.to));
        return;
      }

      if (REVEAL_MARK.has(name)) {
        const parent = node.node.parent;
        if (parent && !touch(parent.from, parent.to)) hideRange(node.from, node.to);
        return;
      }
    },
  });

  return { decorations: Decoration.set(deco, true), atomic: Decoration.set(atomic, true) };
}

// Fenced code: every line keeps the dark code styling. When the caret is
// outside the block the fence lines (``` and the language label) have their text
// hidden — leaving a slim dark band that reads as the block's padding — but the
// lines themselves stay intact so line styling/structure is preserved. When the
// caret is inside, the ```lang / ``` fences are shown.
function buildFence(
  node: { from: number; to: number },
  doc: EditorState["doc"],
  inside: boolean,
  deco: Range<Decoration>[],
  hideRange: (from: number, to: number) => void,
) {
  const firstNo = doc.lineAt(node.from).number;
  const lastNo = doc.lineAt(Math.min(node.to, doc.length)).number;

  for (let ln = firstNo; ln <= lastNo; ln++) {
    const line = doc.line(ln);
    const isFence = ln === firstNo || (ln === lastNo && lastNo > firstNo && /^\s*```+/.test(line.text));
    let cls = "cm-code";
    if (ln === firstNo) cls += " cm-code-top";
    if (ln === lastNo) cls += " cm-code-bottom";
    if (!inside && isFence) cls += " cm-code-fence";
    deco.push(Decoration.line({ class: cls }).range(line.from));
    if (!inside && isFence && line.to > line.from) hideRange(line.from, line.to);
  }
}

export function livePreview(): Extension {
  return StateField.define<LiveValue>({
    create: (state) => build(state),
    update(value, tr) {
      if (tr.docChanged || tr.selection) return build(tr.state);
      return value;
    },
    provide: (f) => [
      EditorView.decorations.from(f, (v) => v.decorations),
      EditorView.atomicRanges.of((view) => view.state.field(f).atomic),
    ],
  });
}
