import { describe, expect, it } from "vitest";
import {
  type Stop,
  type WeatherSummary,
  clothingForStops,
  dominantClimate,
  isMultiStop,
  stopStartDates,
  stopsLabel,
  totalNights,
  tripClimates,
  tripRainyDays,
} from "@/lib/packing";

const weather = (avgHigh: number, rainyDays = 0): WeatherSummary => ({ place: "x", avgHigh, avgLow: avgHigh - 8, rainyDays } as WeatherSummary);
const stops: Stop[] = [
  { id: "a", place: "Rome", nights: 3, weather: weather(31) },
  { id: "b", place: "Florence", nights: 2, weather: weather(12, 2) },
  { id: "c", place: " Venice ", nights: 4 },
];

describe("multi-location trips", () => {
  it("adds up nights and labels the route", () => {
    expect(totalNights(stops)).toBe(9);
    expect(stopsLabel(stops)).toBe("Rome → Florence → Venice");
    expect(isMultiStop({ stops })).toBe(true);
    expect(isMultiStop({ stops: [] })).toBe(false);
    expect(isMultiStop({})).toBe(false);
  });

  it("works out when each stop starts", () => {
    expect(stopStartDates("2026-06-10", stops)).toEqual(["2026-06-10", "2026-06-13", "2026-06-15"]);
    expect(stopStartDates("2026-02-27", [{ id: "a", place: "", nights: 2 }, { id: "b", place: "", nights: 1 }])).toEqual(["2026-02-27", "2026-03-01"]);
  });

  it("does not crash when the start date is cleared or half typed", () => {
    expect(stopStartDates("", stops)).toEqual(["", "", ""]);
    expect(stopStartDates("2026-13-45", stops)).toEqual(["", "", ""]);
  });

  it("covers every climate and the rainy days across stops", () => {
    expect(tripClimates({ stops }).sort()).toEqual(["hot", "mild"]);
    expect(tripRainyDays({ stops })).toBe(2);
    expect(dominantClimate({ stops })).toBe("hot"); // Rome is the longest stop with a forecast
  });

  it("packs basics for the whole trip but weather clothes per stop", () => {
    const clothes = clothingForStops(stops);
    const qty = (name: string) => clothes.find((c) => c.name === name)?.qty;
    expect(qty("Underwear")).toBeGreaterThanOrEqual(totalNights(stops));
    expect(new Set(clothes.map((c) => c.name)).size).toBe(clothes.length); // no duplicate rows
    expect(clothes.length).toBeGreaterThan(3);
  });

  it("copes with an empty trip", () => {
    expect(clothingForStops([])).toBeDefined();
    expect(totalNights([])).toBe(0);
  });
});
