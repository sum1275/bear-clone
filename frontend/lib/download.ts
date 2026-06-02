// Tiny client-side download helper: turns text into a file the browser saves.
// Used by the Export actions in the library and editor menus.

export function downloadText(filename: string, text: string, mime = "text/markdown") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Remove inline #tags from content — used when "Keep tags during export" is off.
export function stripTags(content: string): string {
  return content
    .replace(/(^|[\s(])#[A-Za-z0-9_][A-Za-z0-9_/-]*/g, "$1")
    .replace(/[ \t]+/g, " ") // collapse the runs of spaces tags leave behind
    .replace(/ *\n */g, "\n") // and the whitespace hugging line breaks
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// A filesystem-safe filename from a note title (falls back to "note").
export function safeFilename(title: string, ext: string): string {
  const base =
    title
      .replace(/[\p{Extended_Pictographic}\u{FE0F}]/gu, "") // strip emoji
      .replace(/[^\w\s-]/g, "") // drop punctuation
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "note";
  return `${base}.${ext}`;
}
