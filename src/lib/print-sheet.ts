// Printable copy of a packing list, drawn to look like a sheet of lined paper.
// This file is pure (no browser APIs): it decides which line each item goes on, splits the list
// across pages, and wraps the page images into a PDF. The drawing itself is in print-render.ts.

import type { Item, PackList } from "./packing";

export type PrintRow = { kind: "heading" | "item" | "more"; text: string; packed?: boolean };
export type PrintGroup = { name: string; items: Item[] };

/** A4 at 200 dpi, in pixels. Lines are `gap` apart; page 1 has a header above its first line. */
export const SHEET = {
  w: 1654,
  h: 2339,
  gap: 64,
  firstLinePage1: 394,
  firstLineLater: 130,
  lastLine: 2230,
  marginX: 190,
  boxX: 214,
  textX: 282,
  rightX: 1590,
} as const;

export function linesOnPage(first: boolean): number {
  const start = first ? SHEET.firstLinePage1 : SHEET.firstLineLater;
  return Math.floor((SHEET.lastLine - start) / SHEET.gap) + 1;
}

export function buildRows(groups: PrintGroup[]): PrintRow[] {
  const rows: PrintRow[] = [];
  for (const group of groups) {
    if (!group.items.length) continue;
    const done = group.items.filter((item) => item.packed).length;
    rows.push({ kind: "heading", text: `${group.name}  ${done}/${group.items.length}` });
    for (const item of group.items) {
      rows.push({ kind: "item", text: item.qty > 1 ? `${item.qty} × ${item.name}` : item.name, packed: item.packed });
    }
  }
  return rows;
}

// Long names continue on the next line instead of running off the page.
export function wrapRows(rows: PrintRow[], measure: (text: string, kind: PrintRow["kind"]) => number, maxWidth: number): PrintRow[] {
  const out: PrintRow[] = [];
  for (const row of rows) {
    if (measure(row.text, row.kind) <= maxWidth) {
      out.push(row);
      continue;
    }
    let line = "";
    let first = true;
    const flush = () => {
      if (!line) return;
      out.push(first ? { ...row, text: line } : { kind: "more", text: line, ...(row.packed !== undefined ? { packed: row.packed } : {}) });
      first = false;
      line = "";
    };
    for (const word of row.text.split(/\s+/).filter(Boolean)) {
      const attempt = line ? `${line} ${word}` : word;
      if (measure(attempt, row.kind) <= maxWidth) {
        line = attempt;
        continue;
      }
      flush();
      // A single word wider than the line is cut into pieces.
      let rest = word;
      while (measure(rest, row.kind) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && measure(rest.slice(0, cut), row.kind) > maxWidth) cut -= 1;
        line = rest.slice(0, cut);
        flush();
        rest = rest.slice(cut);
      }
      line = rest;
    }
    flush();
  }
  return out;
}

export function paginate(rows: PrintRow[]): PrintRow[][] {
  const pages: PrintRow[][] = [];
  let current: PrintRow[] = [];
  let limit = linesOnPage(true);
  for (const row of rows) {
    if (current.length >= limit) {
      pages.push(current);
      current = [];
      limit = linesOnPage(false);
    }
    current.push(row);
  }
  // Never leave a heading on its own at the bottom of a page.
  const last = current.at(-1);
  if (current.length && last?.kind === "heading" && current.length >= limit) {
    // handled below when the next row arrives
  }
  pages.push(current);
  for (let i = 0; i < pages.length - 1; i++) {
    const page = pages[i];
    const next = pages[i + 1];
    const tail = page?.at(-1);
    if (page && next && tail?.kind === "heading") {
      page.pop();
      next.unshift(tail);
    }
  }
  return pages.filter((page, index) => page.length > 0 || index === 0);
}

function niceDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return "";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function tripSubtitle(list: Pick<PackList, "destination" | "startDate" | "nights" | "leaveTime">): string {
  const parts = [
    list.destination.trim(),
    niceDate(list.startDate),
    list.nights > 0 ? `${list.nights} night${list.nights === 1 ? "" : "s"}` : "",
    list.leaveTime ? `leaving ${list.leaveTime}` : "",
  ];
  return parts.filter(Boolean).join(" · ");
}

// ---------- PDF ----------

export type PdfImage = { data: Uint8Array; width: number; height: number };
const A4_W = 595;
const A4_H = 842;

/** One full-page JPEG per page, wrapped in a minimal PDF. */
export function buildPdf(images: PdfImage[]): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: Uint8Array | string) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const begin = (n: number) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
  };

  const count = images.length;
  push("%PDF-1.4\n");
  begin(1);
  push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  begin(2);
  push(`<< /Type /Pages /Kids [${images.map((_, i) => `${3 + 3 * i} 0 R`).join(" ")}] /Count ${count} >>\nendobj\n`);
  images.forEach((image, i) => {
    const page = 3 + 3 * i;
    const draw = `q ${A4_W} 0 0 ${A4_H} 0 0 cm /Im0 Do Q`;
    begin(page);
    push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] /Resources << /XObject << /Im0 ${page + 2} 0 R >> >> /Contents ${page + 1} 0 R >>\nendobj\n`);
    begin(page + 1);
    push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream\nendobj\n`);
    begin(page + 2);
    push(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`);
    push(image.data);
    push("\nendstream\nendobj\n");
  });

  const total = 3 * count + 3;
  const xref = length;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let n = 1; n < total; n++) push(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

export function dataUrlToBytes(url: string): Uint8Array {
  const binary = atob(url.slice(url.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ---------- Handwriting choices for the printable copy ----------

export type PrintFont = { name: string; google: string; css: string; scale: number; note: string };

/** `google` is the Google Fonts family query; `scale` evens out fonts that run big or small. */
export const PRINT_FONTS: PrintFont[] = [
  { name: "Caveat", google: "Caveat:wght@500;700", css: '"Caveat", cursive', scale: 1, note: "Quick, loopy handwriting" },
  { name: "Patrick Hand", google: "Patrick+Hand", css: '"Patrick Hand", cursive', scale: 0.92, note: "Neat, rounded print" },
  { name: "Indie Flower", google: "Indie+Flower", css: '"Indie Flower", cursive', scale: 0.88, note: "Casual felt-tip" },
  { name: "Shadows Into Light", google: "Shadows+Into+Light", css: '"Shadows Into Light", cursive', scale: 1, note: "Light, airy pen" },
  { name: "Nanum Pen Script", google: "Nanum+Pen+Script", css: '"Nanum Pen Script", cursive', scale: 1.15, note: "Thin, fast scrawl" },
  { name: "Kalam", google: "Kalam:wght@400;700", css: '"Kalam", cursive', scale: 0.88, note: "Marker-pen look" },
  { name: "Courier Prime", google: "Courier+Prime:wght@400;700", css: '"Courier Prime", "Courier New", monospace', scale: 0.8, note: "Typewriter" },
  { name: "Plain sans-serif", google: "", css: "Arial, Helvetica, sans-serif", scale: 0.8, note: "Clean and easy to read" },
];

export const DEFAULT_PRINT_FONT = "Caveat";

export function printFontByName(name: string | null | undefined): PrintFont {
  return PRINT_FONTS.find((f) => f.name === name) ?? PRINT_FONTS[0]!;
}
