/**
 * Look & feel options for the Settings tab.
 *
 * A colour option is a pair: a background and the ink colour used for text and buttons.
 * Everything else (cards, borders, muted text, the header) is mixed from those two in
 * styles.css, so every option stays readable.
 */

export type Palette = { name: string; bg: string; ink: string };

export const PALETTES: Palette[] = [
  { name: "Paper", bg: "#F3EFE7", ink: "#141414" },
  { name: "Night", bg: "#141414", ink: "#F3EFE7" },
  { name: "Tangerine", bg: "#FF533B", ink: "#191919" },
  { name: "Allotment", bg: "#193428", ink: "#F2E5CA" },
  { name: "Sherbet", bg: "#FFCD4A", ink: "#191932" },
  { name: "Slate", bg: "#262839", ink: "#EAF0F2" },
  { name: "Lilac", bg: "#E6DFF2", ink: "#330894" },
  { name: "Harbour", bg: "#003249", ink: "#FEFFFE" },
  { name: "Postbox", bg: "#FFF9EE", ink: "#C41523" },
  { name: "Lido", bg: "#79C3E0", ink: "#002A3D" },
  { name: "Sage", bg: "#D1DED7", ink: "#581D25" },
  { name: "Grape", bg: "#352D7D", ink: "#FEB02E" },
  { name: "Linen", bg: "#EAE0D7", ink: "#222F19" },
  { name: "Midnight", bg: "#0D1121", ink: "#F8D26D" },
  { name: "Deep Sea", bg: "#0E1C34", ink: "#61D5FC" },
  { name: "Clay", bg: "#CA4C3B", ink: "#FFF2E1" },
  { name: "Pistachio", bg: "#BFE0A0", ink: "#15331B" },
  { name: "Hazard", bg: "#000000", ink: "#FF4720" },
  { name: "Christmas", bg: "#063321", ink: "#F8F2EA" },
  { name: "Halloween", bg: "#382056", ink: "#FF8030" },
];

/** `family` is the Google Fonts name; `css` is what goes in font-family. */
export type FontOption = { name: string; family: string; css: string };

export const FONTS: FontOption[] = [
  { name: "Archivo Black", family: "Archivo+Black", css: '"Archivo Black", sans-serif' },
  { name: "Bricolage Grotesque", family: "Bricolage+Grotesque:wght@700", css: '"Bricolage Grotesque", sans-serif' },
  { name: "DM Serif Display", family: "DM+Serif+Display", css: '"DM Serif Display", serif' },
  { name: "Fraunces", family: "Fraunces:wght@600;800", css: '"Fraunces", serif' },
  { name: "Rubik Mono One", family: "Rubik+Mono+One", css: '"Rubik Mono One", monospace' },
  { name: "Space Mono", family: "Space+Mono:wght@700", css: '"Space Mono", monospace' },
  { name: "Syne", family: "Syne:wght@700;800", css: '"Syne", sans-serif' },
  { name: "Anton", family: "Anton", css: '"Anton", sans-serif' },
  { name: "Bodoni Moda", family: "Bodoni+Moda:wght@600;800", css: '"Bodoni Moda", serif' },
  { name: "Unbounded", family: "Unbounded:wght@700", css: '"Unbounded", sans-serif' },
  { name: "Instrument Serif", family: "Instrument+Serif", css: '"Instrument Serif", serif' },
  { name: "Big Shoulders Display", family: "Big+Shoulders+Display:wght@800", css: '"Big Shoulders Display", sans-serif' },
];

/** "plain" is the default flat, ruled look; "classic" is the original rounded, gradient look. */
export type StyleChoice = "plain" | "classic";

export type ThemeChoice = { palette?: string | undefined; font?: string | undefined; style?: "classic" | undefined };

/** The app's original look. `undefined` palette/font means "leave the built-in styles alone". */
export const DEFAULT_THEME: ThemeChoice = {};

const STORAGE_KEY = "pack-smart-theme";
const FONT_LINK_ID = "pack-smart-font";
export const PREVIEW_LINK_ID = "pack-smart-font-previews";

export function loadTheme(): ThemeChoice {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as ThemeChoice;
    return {
      palette: PALETTES.some((p) => p.name === raw.palette) ? raw.palette : undefined,
      font: FONTS.some((f) => f.name === raw.font) ? raw.font : undefined,
      style: raw.style === "classic" ? "classic" : undefined,
    };
  } catch {
    return {};
  }
}

export function saveTheme(theme: ThemeChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    /* private mode etc. — the theme still applies for this visit */
  }
}

function ensureLink(id: string, href: string) {
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

/** Loads every font once so the Settings tab can show each name in its own typeface. */
export function loadFontPreviews() {
  const families = FONTS.map((f) => `family=${f.family}`).join("&");
  ensureLink(PREVIEW_LINK_ID, `https://fonts.googleapis.com/css2?${families}&display=swap`);
}

export function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  if (theme.style === "classic") root.dataset["style"] = "classic";
  else delete root.dataset["style"];
  const palette = PALETTES.find((p) => p.name === theme.palette);
  if (palette) {
    root.dataset["palette"] = palette.name.toLowerCase().replace(/\s+/g, "-");
    root.style.setProperty("--pal-bg", palette.bg);
    root.style.setProperty("--pal-ink", palette.ink);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", palette.bg);
  } else {
    delete root.dataset["palette"];
    root.style.removeProperty("--pal-bg");
    root.style.removeProperty("--pal-ink");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.style === "classic" ? "#e36e37" : "#c93a2a");
  }
  const font = FONTS.find((f) => f.name === theme.font);
  if (font) {
    ensureLink(FONT_LINK_ID, `https://fonts.googleapis.com/css2?family=${font.family}&display=swap`);
    root.style.setProperty("--font-display", font.css);
  } else {
    document.getElementById(FONT_LINK_ID)?.remove();
    root.style.removeProperty("--font-display");
  }
}
