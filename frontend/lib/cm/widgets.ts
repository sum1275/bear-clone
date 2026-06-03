// Inline widgets the live-preview plugin swaps in for raw markdown.

import { EditorView, WidgetType } from "@codemirror/view";
import { renderMarkdown } from "@/lib/markdown";

// A real checkbox in place of `- [ ]` / `- [x]`. Clicking it flips just the
// status character in the document — the raw `[ ]`/`[x]` is never shown.
export class CheckboxWidget extends WidgetType {
  // `pos` is the offset of the single status char (the space or x) inside `[ ]`.
  constructor(
    readonly checked: boolean,
    readonly pos: number,
  ) {
    super();
  }

  eq(other: CheckboxWidget) {
    return other.checked === this.checked && other.pos === this.pos;
  }

  toDOM(view: EditorView) {
    const box = document.createElement("span");
    box.className = `cm-task-box${this.checked ? " checked" : ""}`;
    box.setAttribute("aria-hidden", "true");
    box.addEventListener("mousedown", (e) => {
      e.preventDefault();
      view.dispatch({
        changes: { from: this.pos, to: this.pos + 1, insert: this.checked ? " " : "x" },
      });
    });
    return box;
  }

  ignoreEvent() {
    return false; // let the widget handle its own clicks
  }
}

// Gray bullet in place of a `-`/`*`/`+` list marker.
export class BulletWidget extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const s = document.createElement("span");
    s.className = "cm-bullet";
    s.textContent = "•";
    return s;
  }
}

// A subtle divider in place of a `---` thematic break.
export class HrWidget extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const hr = document.createElement("div");
    hr.className = "cm-hr";
    return hr;
  }
  ignoreEvent() {
    return true;
  }
}

// Render-only table. The whole markdown table is replaced by its rendered HTML
// (reusing the app's renderer); editing is deferred to a later pass.
export class TableWidget extends WidgetType {
  constructor(readonly source: string) {
    super();
  }
  eq(other: TableWidget) {
    return other.source === this.source;
  }
  toDOM() {
    const wrap = document.createElement("div");
    wrap.className = "cm-table";
    wrap.innerHTML = renderMarkdown(this.source);
    return wrap;
  }
  ignoreEvent() {
    return true;
  }
}
