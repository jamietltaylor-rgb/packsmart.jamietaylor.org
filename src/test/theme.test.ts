import { beforeEach, describe, expect, it } from "vitest";
import { loadTheme } from "@/lib/theme";

describe("theme choices", () => {
  beforeEach(() => localStorage.clear());
  it("defaults to the plain style with no palette or font", () => {
    expect(loadTheme()).toEqual({ palette: undefined, font: undefined, style: undefined });
  });
  it("remembers the classic style and ignores unknown values", () => {
    localStorage.setItem("pack-smart-theme", JSON.stringify({ style: "classic", palette: "Lido", font: "Nope" }));
    expect(loadTheme()).toEqual({ palette: "Lido", font: undefined, style: "classic" });
    localStorage.setItem("pack-smart-theme", JSON.stringify({ style: "neon" }));
    expect(loadTheme().style).toBeUndefined();
  });
});
