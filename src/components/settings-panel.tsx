import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { loadPrintFont, loadPrintFontPreviews, savePrintFont } from "@/lib/print-render";
import { PRINT_FONTS } from "@/lib/print-sheet";
import { FONTS, PALETTES, loadFontPreviews, type ThemeChoice } from "@/lib/theme";

const ORIGINAL = "Original";

export function SettingsPanel({ theme, onChange }: { theme: ThemeChoice; onChange: (theme: ThemeChoice) => void }) {
  // Only fetch the full set of fonts when someone opens Settings, so the rest of the app stays light.
  useEffect(() => loadFontPreviews(), []);
  useEffect(() => loadPrintFontPreviews(), []);
  const [printFont, setPrintFont] = useState(loadPrintFont);

  const selectedPalette = theme.palette ?? ORIGINAL;
  const selectedFont = theme.font ?? "Fraunces";
  const changed = Boolean(theme.palette || theme.font || theme.style);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">Pick the style, colours and typeface you like. Your choice is remembered on this device.</p>
        </div>
        <Button variant="outline" disabled={!changed} onClick={() => onChange({})}>Reset to the default look</Button>
      </div>

      <section aria-labelledby="style-heading">
        <h3 id="style-heading" className="font-display text-lg font-semibold">Style</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {([
            { id: undefined, name: "Plain", hint: "Flat and ruled, like a paper list" },
            { id: "classic", name: "Classic", hint: "The original: rounded, with a gradient header" },
          ] as const).map((option) => {
            const on = (theme.style ?? undefined) === option.id;
            return (
              <button
                key={option.name}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...theme, style: option.id })}
                className={`rounded-lg border-2 bg-card p-3 text-left ${on ? "border-primary" : "border-border"}`}
              >
                <span className="block font-semibold">{option.name}{on ? " ✓" : ""}</span>
                <span className="block text-sm text-muted-foreground">{option.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="colours-heading">
        <h3 id="colours-heading" className="font-display text-lg font-semibold">Colours</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <button
            type="button"
            aria-pressed={selectedPalette === ORIGINAL}
            onClick={() => onChange({ ...theme, palette: undefined })}
            className={`flex h-16 items-end rounded-lg border p-2 text-left text-sm font-semibold text-primary-foreground bg-sunset ${selectedPalette === ORIGINAL ? "ring-4 ring-ring ring-offset-2 ring-offset-background" : ""}`}
          >
            {ORIGINAL}
          </button>
          {PALETTES.map((p) => (
            <button
              key={p.name}
              type="button"
              aria-pressed={selectedPalette === p.name}
              onClick={() => onChange({ ...theme, palette: p.name })}
              style={{ backgroundColor: p.bg, color: p.ink, borderColor: p.ink }}
              className={`flex h-16 items-end rounded-lg border p-2 text-left text-sm font-semibold ${selectedPalette === p.name ? "ring-4 ring-ring ring-offset-2 ring-offset-background" : ""}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="typeface-heading">
        <h3 id="typeface-heading" className="font-display text-lg font-semibold">Typeface</h3>
        <p className="text-sm text-muted-foreground">Used for titles and headings.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {FONTS.map((f) => {
            const on = selectedFont === f.name;
            return (
              <button
                key={f.name}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...theme, font: f.name === "Fraunces" ? undefined : f.name })}
                style={{ fontFamily: f.css }}
                className={`flex min-h-14 items-center rounded-lg border px-3 py-2 text-left text-base ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"}`}
              >
                {f.name}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="print-font-heading">
        <h3 id="print-font-heading" className="font-display text-lg font-semibold">Printable list handwriting</h3>
        <p className="text-sm text-muted-foreground">The writing used on the lined-paper PDF you can download from a trip.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PRINT_FONTS.map((f) => {
            const on = printFont === f.name;
            return (
              <button
                key={f.name}
                type="button"
                aria-pressed={on}
                onClick={() => { setPrintFont(f.name); savePrintFont(f.name); }}
                className={`rounded-lg border px-3 py-2 text-left ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"}`}
              >
                <span className="block text-xl" style={{ fontFamily: f.css }}>{f.name}</span>
                <span className={`block text-xs ${on ? "opacity-90" : "text-muted-foreground"}`}>{f.note}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="preview-heading" className="rounded-xl bg-accent p-5 text-accent-foreground">
        <h3 id="preview-heading" className="text-xs uppercase tracking-wide opacity-75">Preview</h3>
        <p className="mt-1 font-display text-3xl font-extrabold">Pack Smart<span className="classic-only"> ✈️</span></p>
        <p className="mt-1 text-sm">Holiday packing lists that know what the weather's doing.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground">Passport</span>
          <span className="rounded-full border border-border bg-card px-3 py-1 text-sm">Sun cream</span>
          <span className="rounded-full border border-border bg-muted px-3 py-1 text-sm text-muted-foreground">Umbrella</span>
        </div>
      </section>
    </div>
  );
}
