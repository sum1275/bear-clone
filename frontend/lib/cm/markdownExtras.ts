// Extra inline markdown constructs for the live editor's Lezer parser.
//
// The base @codemirror/lang-markdown parser plus GFM (tables, task lists,
// strikethrough) covers most of what the app's renderer understands. Two app
// specials are missing and added here:
//   - `==highlight==` (Bear-style highlight) — modelled exactly like GFM's
//     `~~strikethrough~~` delimiter.
//   - `#tag` inline hashtags — a standalone element so the live-preview plugin
//     can style them (they have no delimiter to hide/reveal).

import { GFM, type MarkdownConfig } from "@lezer/markdown";

// Mirrors the punctuation class lezer uses internally for delimiter flanking.
const Punctuation = /[!-/:-@[-`{-~¡‐-‧]/;

const HighlightDelim = { resolve: "Highlight", mark: "HighlightMark" };

const Highlight: MarkdownConfig = {
  defineNodes: ["Highlight", "HighlightMark"],
  parseInline: [
    {
      name: "Highlight",
      parse(cx, next, pos) {
        // `==` opener/closer, but not `===`
        if (next != 61 /* = */ || cx.char(pos + 1) != 61 || cx.char(pos + 2) == 61) return -1;
        const before = cx.slice(pos - 1, pos);
        const after = cx.slice(pos + 2, pos + 3);
        const sBefore = /\s|^$/.test(before);
        const sAfter = /\s|^$/.test(after);
        const pBefore = Punctuation.test(before);
        const pAfter = Punctuation.test(after);
        return cx.addDelimiter(
          HighlightDelim,
          pos,
          pos + 2,
          !sAfter && (!pAfter || sBefore || pBefore),
          !sBefore && (!pBefore || sAfter || pAfter),
        );
      },
      after: "Emphasis",
    },
  ],
};

const isTagStart = (c: number) =>
  (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95; // 0-9 A-Z a-z _
const isTagChar = (c: number) => isTagStart(c) || c === 45 || c === 47; // + - /

const Hashtag: MarkdownConfig = {
  defineNodes: ["Hashtag"],
  parseInline: [
    {
      name: "Hashtag",
      parse(cx, next, pos) {
        if (next != 35 /* # */) return -1;
        // Must start the inline run or follow whitespace / "(" so mid-word
        // "foo#bar" is ignored — matches lib/markdown.ts extractTags.
        if (pos > cx.offset) {
          const prev = cx.char(pos - 1);
          if (!(prev === 32 || prev === 9 || prev === 40)) return -1;
        }
        const first = cx.char(pos + 1);
        if (first < 0 || !isTagStart(first)) return -1;
        let end = pos + 2;
        while (end < cx.end && isTagChar(cx.char(end))) end++;
        return cx.addElement(cx.elt("Hashtag", pos, end));
      },
      before: "Emphasis",
    },
  ],
};

const Wikilink: MarkdownConfig = {
  defineNodes: ["Wikilink"],
  parseInline: [
    {
      name: "Wikilink",
      parse(cx, next, pos) {
        if (next != 91 /* [ */ || cx.char(pos + 1) != 91) return -1;
        let i = pos + 2;
        while (i < cx.end && !(cx.char(i) === 93 /* ] */ && cx.char(i + 1) === 93)) i++;
        if (i >= cx.end) return -1; // no closing ]]
        return cx.addElement(cx.elt("Wikilink", pos, i + 2));
      },
      before: "Link",
    },
  ],
};

export const markdownExtensions = [GFM, Highlight, Hashtag, Wikilink];
