<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version (16.x) has breaking changes — APIs, conventions, and file structure may differ from your training data. Heed deprecation notices.

## Consult the bundled docs — but cheaply

The real docs ship in `node_modules/next/dist/docs/`. It is **~3.5 MB across 421 files** — do NOT read or grep the tree broadly; that burns a huge amount of context for almost no signal. Instead, when you're about to use a Next API whose current behavior you're unsure of:

1. Open **`node_modules/next/dist/docs/index.md`** first (~70 lines). It's the table of contents and carries inline "AI agent hint" notes that point at the exact file for common pitfalls.
2. Open **at most one** specific guide it directs you to (e.g. `01-app/02-guides/<topic>.mdx`) — read that single file, not its siblings.
3. If you don't know which file applies, **list filenames** (`ls` / `find -name`) to locate it; never `cat` whole directories.

Skip the docs entirely for changes that don't touch an uncertain Next API.
<!-- END:nextjs-agent-rules -->
