import { describe, it, expect } from "vitest";
import { buildPdf, buildRows, linesOnPage, paginate, wrapRows, tripSubtitle } from "@/lib/print-sheet";

const item = (name: string, packed = false, qty = 1) => ({ id: name, name, qty, packed });

describe("print sheet", () => {
  it("builds headings with counts and quantities", () => {
    const rows = buildRows([{ name: "Clothes", items: [item("Socks", true, 3), item("Hat")] }, { name: "Empty", items: [] }]);
    expect(rows.map((r) => r.text)).toEqual(["Clothes  1/2", "3 × Socks", "Hat"]);
  });
  it("wraps long names onto continuation lines", () => {
    const rows = wrapRows([{ kind: "item", text: "aaa bbb ccc ddd" }], (t) => t.length, 8);
    expect(rows.map((r) => r.text)).toEqual(["aaa bbb", "ccc ddd"]);
    expect(rows[1]?.kind).toBe("more");
  });
  it("cuts a single over-long word", () => {
    const rows = wrapRows([{ kind: "item", text: "abcdefghij" }], (t) => t.length, 4);
    expect(rows.every((r) => r.text.length <= 4)).toBe(true);
    expect(rows.map((r) => r.text).join("")).toBe("abcdefghij");
  });
  it("paginates and keeps headings off the page bottom", () => {
    const n = linesOnPage(true);
    const rows = [
      ...Array.from({ length: n - 1 }, (_, i) => ({ kind: "item" as const, text: `i${i}` })),
      { kind: "heading" as const, text: "H" },
      { kind: "item" as const, text: "after" },
    ];
    const pages = paginate(rows);
    expect(pages.length).toBe(2);
    expect(pages[0]?.at(-1)?.kind).toBe("item");
    expect(pages[1]?.[0]?.text).toBe("H");
  });
  it("makes one empty page for an empty list", () => {
    expect(paginate([]).length).toBe(1);
  });
  it("writes a PDF with the right page count and header", () => {
    const img = { data: new Uint8Array([1, 2, 3]), width: 10, height: 10 };
    const text = new TextDecoder("latin1").decode(buildPdf([img, img]));
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("/Count 2");
    expect(text).toContain("%%EOF");
  });
  it("describes the trip", () => {
    expect(tripSubtitle({ destination: "Rome", startDate: "2026-05-01", nights: 1 })).toContain("1 night");
  });
});
