// Structural CodeMirror theme for the live editor. Only baseline concerns live
// here (font, caret, selection, padding); the rich per-construct visuals are
// plain CSS in app/styles/editor.css next to the .doc styles they mirror.

import { EditorView } from "@codemirror/view";

export const editorTheme = EditorView.theme({
  "&": {
    color: "var(--text)",
    backgroundColor: "transparent",
    fontSize: "inherit", // inherit .doc.mac's font-size (scales on narrow)
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "inherit",
    lineHeight: "var(--doc-lh, 1.65)",
  },
  ".cm-content": {
    padding: "0",
    caretColor: "var(--caret)",
  },
  ".cm-line": { padding: "0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--caret)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "color-mix(in srgb, var(--text) 12%, transparent)",
  },
});
