import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FONTS, PALETTES, loadFontPreviews, type ThemeChoice } from "@/lib/theme";

const ORIGINAL = "Original";

export function SettingsPanel({ theme, onChange }: { theme: ThemeChoice; onChange: (theme: ThemeChoice) => void }) {
  // Only fetch the full set of fonts when someone opens Settings, so the rest of the app stays light.
  useEffect(() => loadFontPreviews(), []);

  const selectedPalette = theme.palette ?? ORIGINAL;
  const selectedFont = theme.font ?? "Fraunces";
  const changed = Boolean(theme.palette || theme.font);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">Pick the colours and typeface you like. Your choice is remembered on this device.</p>
        </div>
        <Button variant="outline" disabled={!changed} onClick={() => onChange({})}>Reset to original look</Button>
      </div>

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

      <section aria-labelledby="preview-heading" className="rounded-xl bg-accent p-5 text-accent-foreground">
        <h3 id="preview-heading" className="text-xs uppercase tracking-wide opacity-75">Preview</h3>
        <p className="mt-1 font-display text-3xl font-extrabold">Pack Smart ✈️</p>
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
