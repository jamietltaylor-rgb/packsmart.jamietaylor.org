// Draws the packing list onto canvases that look like pages of lined paper, then saves them as a PDF.
// Browser only. The layout maths lives in print-sheet.ts.

import { buildPdf, buildRows, dataUrlToBytes, paginate, SHEET, tripSubtitle, wrapRows, type PdfImage, type PrintRow } from "./print-sheet";
import { groupItems, type PackList } from "./packing";

const HAND = '"Caveat", "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';

async function loadHandwriting(): Promise<void> {
  try {
    if (!document.getElementById("print-font")) {
      const link = document.createElement("link");
      link.id = "print-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap";
      document.head.appendChild(link);
    }
    await Promise.race([
      Promise.all([document.fonts.load('500 40px "Caveat"'), document.fonts.load('700 40px "Caveat"')]),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    // The fallback handwriting-style fonts are used instead.
  }
}

function font(kind: PrintRow["kind"]): string {
  if (kind === "heading") return `700 54px ${HAND}`;
  return `500 46px ${HAND}`;
}

function drawPage(ctx: CanvasRenderingContext2D, rows: PrintRow[], first: boolean, list: PackList, pageNo: number, pages: number, packedText: string) {
  const { w, h, gap, marginX, boxX, textX, rightX } = SHEET;
  const top = first ? SHEET.firstLinePage1 : SHEET.firstLineLater;

  // paper
  ctx.fillStyle = "#fdfbf3";
  ctx.fillRect(0, 0, w, h);

  // blue rules, running the full height as on a real pad
  ctx.strokeStyle = "#b9cde6";
  ctx.lineWidth = 2;
  for (let y = top - (first ? 0 : 0); y < h - 60; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  if (first) {
    for (let y = top - gap; y > 120; y -= gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else {
    for (let y = top - gap; y > 40; y -= gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  // margin line
  ctx.strokeStyle = "#e39a9a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(marginX, 0);
  ctx.lineTo(marginX, h);
  ctx.stroke();

  // punch holes
  ctx.fillStyle = "#e4e1d6";
  for (const y of [h * 0.18, h * 0.5, h * 0.82]) {
    ctx.beginPath();
    ctx.arc(70, y, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#23304a";

  if (first) {
    ctx.font = `700 92px ${HAND}`;
    ctx.fillText(list.name || "Packing list", textX - 40, 200, rightX - textX);
    const sub = tripSubtitle(list);
    if (sub) {
      ctx.font = `500 48px ${HAND}`;
      ctx.fillStyle = "#4a5a78";
      ctx.fillText(sub, textX - 40, 290, rightX - textX);
    }
    ctx.fillStyle = "#23304a";
  }

  rows.forEach((row, i) => {
    const base = top + i * gap - 18; // sits just above its rule
    if (row.kind === "heading") {
      ctx.font = font("heading");
      ctx.fillStyle = "#8a2f2f";
      ctx.fillText(row.text, boxX, base, rightX - boxX);
      ctx.fillStyle = "#23304a";
      return;
    }
    ctx.font = font(row.kind);
    if (row.kind === "item") {
      ctx.strokeStyle = "#23304a";
      ctx.lineWidth = 3;
      ctx.strokeRect(boxX, base - 34, 34, 34);
      if (row.packed) {
        ctx.beginPath();
        ctx.moveTo(boxX + 6, base - 18);
        ctx.lineTo(boxX + 15, base - 6);
        ctx.lineTo(boxX + 44, base - 48);
        ctx.stroke();
      }
    }
    ctx.fillStyle = row.packed ? "#7a8396" : "#23304a";
    ctx.fillText(row.text, textX, base, rightX - textX);
    if (row.packed) {
      const width = Math.min(ctx.measureText(row.text).width, rightX - textX);
      ctx.strokeStyle = "#7a8396";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(textX, base - 15);
      ctx.lineTo(textX + width, base - 15);
      ctx.stroke();
    }
    ctx.fillStyle = "#23304a";
  });

  // footer
  ctx.font = `500 34px ${HAND}`;
  ctx.fillStyle = "#8a93a6";
  ctx.textAlign = "right";
  ctx.fillText(`${packedText} · Pack Smart${pages > 1 ? ` · page ${pageNo} of ${pages}` : ""}`, rightX, h - 36);
  ctx.textAlign = "left";
}

export async function downloadPrintableList(list: PackList, categories: string[]): Promise<void> {
  await loadHandwriting();
  const groups = groupItems(list.items, categories);
  const canvas = document.createElement("canvas");
  canvas.width = SHEET.w;
  canvas.height = SHEET.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't draw the printable page.");

  const measure = (text: string, kind: PrintRow["kind"]) => {
    ctx.font = font(kind);
    return ctx.measureText(text).width;
  };
  const rows = wrapRows(buildRows(groups), measure, SHEET.rightX - SHEET.textX);
  const pages = paginate(rows);
  const packed = list.items.filter((item) => item.packed).length;
  const packedText = `Packed ${packed} of ${list.items.length}`;

  const images: PdfImage[] = [];
  pages.forEach((page, index) => {
    drawPage(ctx, page, index === 0, list, index + 1, pages.length, packedText);
    images.push({ data: dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.9)), width: SHEET.w, height: SHEET.h });
  });

  const pdf = buildPdf(images);
  const blob = new Blob([pdf as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safe = (list.name || "packing-list").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "packing-list";
  a.href = url;
  a.download = `${safe}-packing-list.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
