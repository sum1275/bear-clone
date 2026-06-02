// Block segmentation for the live editor.
//
// The live editor renders every block as formatted markdown EXCEPT the block
// the caret sits in, which is shown as raw source. To make that work we split
// the note into blocks at line granularity, so editing one line only reveals
// that one line's source.
//
// Most constructs are kept at single-line granularity (headings, bullets,
// to-dos, paragraphs, blank lines) so "the line you're editing" is literally
// one line. A few constructs only render correctly as a unit and so are grouped
// into a single multi-line block: fenced code, tables, ordered lists (their
// numbering must be contiguous), and blockquotes.

export interface Block {
  /** inclusive start line index */
  start: number;
  /** inclusive end line index */
  end: number;
}

const RE_FENCE = /^```/;
const RE_OL = /^\s*\d+\.\s+/;
const RE_QUOTE = /^\s*>\s?/;
const RE_TABLE = /^\s*\|.*\|\s*$/;

/**
 * Split `content` into editable blocks. Always returns at least one block so an
 * empty note still has a place for the caret. The blocks tile the lines exactly:
 * block[n].start === block[n-1].end + 1, covering 0..lineCount-1.
 */
export function segmentBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code: from the opening fence to the closing fence (or EOF).
    if (RE_FENCE.test(line)) {
      const start = i;
      i++;
      while (i < lines.length && !RE_FENCE.test(lines[i])) i++;
      if (i < lines.length) i++; // include the closing fence line
      blocks.push({ start, end: i - 1 });
      continue;
    }

    // Runs that must stay together to render correctly.
    const runStart = (test: RegExp): boolean => {
      if (!test.test(line)) return false;
      const start = i;
      while (i < lines.length && test.test(lines[i])) i++;
      blocks.push({ start, end: i - 1 });
      return true;
    };
    if (runStart(RE_OL) || runStart(RE_QUOTE) || runStart(RE_TABLE)) continue;

    // Everything else (heading, hr, bullet, to-do, paragraph, blank) = one line.
    blocks.push({ start: i, end: i });
    i++;
  }

  if (blocks.length === 0) blocks.push({ start: 0, end: 0 });
  return blocks;
}

/** The block whose start matches `startLine`, plus its index — or null. */
export function findBlock(
  blocks: Block[],
  startLine: number,
): { block: Block; index: number } | null {
  const index = blocks.findIndex((b) => b.start === startLine);
  return index === -1 ? null : { block: blocks[index], index };
}
