// App settings (Bear-style) — persisted to localStorage, applied client-side.
//
// Typography is the part that actually drives the editor: the numeric fields
// map to CSS custom properties (see settingsToCssVars) that doc.css / editor.css
// read. The General toggles are remembered preferences; the ones with a
// downstream effect today are: newNoteWith (compose) and keepTags (export).

export type NewNoteWith = "heading" | "text";
export type TagPlacement = "bottom" | "top";

export interface Settings {
  // General → Editor
  hideMarkdown: boolean;
  autofillTitles: boolean;
  autocomplete: boolean;
  autosortTodos: boolean;
  keepTags: boolean; // keep #tags when exporting
  newNoteWith: NewNoteWith;
  addTagsAt: TagPlacement;
  // Typography → fonts (display only for now)
  textFont: string;
  headingsFont: string;
  codeFont: string;
  // Typography → metrics (wired to the editor via CSS vars)
  fontSize: number; // px
  lineHeight: number; // unitless em
  lineWidth: number; // px (editor max-width)
  paragraphSpacing: number; // px (paragraph margin)
  paragraphIndent: number; // em (first-line indent)
}

// Defaults chosen so the editor looks exactly as it does today.
export const DEFAULT_SETTINGS: Settings = {
  hideMarkdown: true,
  autofillTitles: true,
  autocomplete: true,
  autosortTodos: true,
  keepTags: true,
  newNoteWith: "heading",
  addTagsAt: "bottom",
  textFont: "Rubik",
  headingsFont: "Rubik Semibold",
  codeFont: "SF Mono",
  fontSize: 17.5,
  lineHeight: 1.65,
  lineWidth: 760,
  paragraphSpacing: 11,
  paragraphIndent: 0,
};

// The typography fields reset by "Restore Editor Defaults".
export const TYPOGRAPHY_KEYS = [
  "fontSize",
  "lineHeight",
  "lineWidth",
  "paragraphSpacing",
  "paragraphIndent",
] as const satisfies readonly (keyof Settings)[];

const KEY = "notes-settings";

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    // Merge so newly-added settings keys fall back to their defaults.
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

// Map the typography metrics to the CSS custom properties the editor reads.
export function settingsToCssVars(s: Settings): Record<string, string> {
  return {
    "--doc-fs": `${s.fontSize}px`,
    "--doc-lh": String(s.lineHeight),
    "--doc-width": `${s.lineWidth}px`,
    "--doc-pspace": `${s.paragraphSpacing}px`,
    "--doc-pindent": `${s.paragraphIndent}em`,
  };
}
