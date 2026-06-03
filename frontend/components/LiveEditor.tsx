"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Annotation, Compartment, EditorSelection, EditorState } from "@codemirror/state";
import { drawSelection, EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { livePreview } from "@/lib/cm/livePreview";
import { markdownExtensions } from "@/lib/cm/markdownExtras";
import { editorTheme } from "@/lib/cm/theme";

export interface LiveEditorHandle {
  /** Wrap the current selection(s), e.g. wrapInline("**") for bold. */
  wrapInline: (before: string, after?: string) => void;
  /** Add/remove a line prefix on the caret line, e.g. "# ", "- ", "- [ ] ". */
  toggleLinePrefix: (prefix: string) => void;
  focus: () => void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

// Marks our own external doc syncs so the update listener doesn't echo them
// back out as user edits.
const External = Annotation.define<boolean>();

export const LiveEditor = forwardRef<LiveEditorHandle, Props>(function LiveEditor(
  { value, onChange, readOnly = false },
  ref,
) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const editable = useRef(new Compartment());

  // Build the editor once.
  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        drawSelection(),
        markdown({ extensions: markdownExtensions }),
        livePreview(),
        editorTheme,
        editable.current.of([
          EditorView.editable.of(!readOnly),
          EditorState.readOnly.of(readOnly),
        ]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged && !u.transactions.some((t) => t.annotation(External))) {
            onChangeRef.current(u.state.doc.toString());
          }
        }),
      ],
    });
    const v = new EditorView({ state, parent: host.current });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (switching notes) without clobbering typing.
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const cur = v.state.doc.toString();
    if (value !== cur) {
      v.dispatch({
        changes: { from: 0, to: cur.length, insert: value },
        annotations: External.of(true),
      });
    }
  }, [value]);

  // Reflect read-only (Trash) without rebuilding the editor.
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    v.dispatch({
      effects: editable.current.reconfigure([
        EditorView.editable.of(!readOnly),
        EditorState.readOnly.of(readOnly),
      ]),
    });
  }, [readOnly]);

  useImperativeHandle(ref, () => ({
    wrapInline(before, after = before) {
      const v = view.current;
      if (!v) return;
      v.dispatch(
        v.state.changeByRange((r) => ({
          changes: [
            { from: r.from, insert: before },
            { from: r.to, insert: after },
          ],
          range: EditorSelection.range(r.from + before.length, r.to + before.length),
        })),
      );
      v.focus();
    },
    toggleLinePrefix(prefix) {
      const v = view.current;
      if (!v) return;
      const line = v.state.doc.lineAt(v.state.selection.main.head);
      const has = line.text.startsWith(prefix);
      v.dispatch({
        changes: has
          ? { from: line.from, to: line.from + prefix.length, insert: "" }
          : { from: line.from, insert: prefix },
      });
      v.focus();
    },
    focus() {
      const v = view.current;
      if (!v) return;
      // Drop the caret at the end — used when focusing a freshly composed note
      // (e.g. the seeded "# ") so typing continues the heading.
      v.dispatch({ selection: { anchor: v.state.doc.length } });
      v.focus();
    },
  }));

  return <div ref={host} className="cm-host" />;
});
