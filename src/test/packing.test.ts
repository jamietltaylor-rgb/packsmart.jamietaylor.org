import { describe, it, expect } from "vitest";
import { clothingFor, climateFor, addItems, fetchWeather, cleanGeneratedIdeas } from "@/lib/packing";
import { vi } from 'vitest';

describe("packing rules", () => {
  it('Add all adds every clothing recommendation in a single update', () => {
    const clothes = clothingFor(5, 'warm');
    const result = addItems([], clothes);
    expect(result.map(({ name, qty }) => ({ name, qty }))).toEqual(clothes);
    expect(result.length).toBe(10);
  });
  it('bulk addition updates existing quantities without duplicate items or losing packed state', () => {
    const result = addItems([{ id: 'socks', name: 'Socks', qty: 1, packed: true }], [{ name: 'Socks', qty: 7 }, { name: 'Sun hat', qty: 1 }]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 'socks', name: 'Socks', qty: 7, packed: true });
  });
  it('daily weather maps each trip date to its own temperatures and rain', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ daily: { time: ['2025-12-01', '2025-12-02'], temperature_2m_max: [21, 18], temperature_2m_min: [12, 10], precipitation_sum: [0, 4], weather_code: [0, 61] } }) }));
    try {
      const result = await fetchWeather({ name: 'Majorca', latitude: 39.6, longitude: 2.7 }, '2027-12-01', 1);
      expect(result.days).toEqual([{ date: '2027-12-01', high: 21, low: 12, rain: 0, code: 0 }, { date: '2027-12-02', high: 18, low: 10, rain: 4, code: 61 }]);
    } finally { vi.unstubAllGlobals(); }
  });
  it("packs one pair of socks per day plus a spare (4 nights = 5 days → 6)", () => {
    expect(clothingFor(4, "mild").find((i) => i.name === "Socks")?.qty).toBe(6);
  });
  it("hot weather includes swimwear, cold includes a winter coat", () => {
    expect(clothingFor(3, "hot").some((i) => i.name === "Swimwear")).toBe(true);
    expect(clothingFor(3, "cold").some((i) => i.name === "Winter coat")).toBe(true);
  });
  it("26°C+ average highs count as hot, under 9°C as cold", () => {
    expect(climateFor({ place: "", avgHigh: 28, avgLow: 20, rainyDays: 0, source: "forecast" })).toBe("hot");
    expect(climateFor({ place: "", avgHigh: 4, avgLow: -2, rainyDays: 0, source: "forecast" })).toBe("cold");
  });
});

import { categoryFor, itemsNeedingCategoryConfirmation, suggest as suggestItems } from "@/lib/packing";
describe("categories and trip types", () => {
  const item = (name: string) => ({ id: name, name, qty: 1, packed: false });
  it("sorts clothes into a user's Clothes category", () => {
    expect(categoryFor(item("Socks"), ["Clothes", "Toiletries"])).toBe("Clothes");
  });
  it("puts unmatched items into Other", () => {
    expect(categoryFor(item("Teddy bear"), ["Clothes"])).toBe("Other");
  });
  it.each(["iPad", "iPad Pro", "AirPods", "MacBook", "Samsung Galaxy Tab", "Nintendo Switch", "Steam Deck", "Apple Watch", "USB-C cable", "Kobo e-reader", "Electric toothbrush", "Hair dryer", "Spare batteries"])("recognises %s as electronics", (name) => {
    expect(categoryFor(item(name), ["Clothes", "Toiletries", "Electronics", "Documents"])).toBe("Electronics");
  });
  it("requires confirmation for an unmatched item but not a recognised iPad", () => {
    expect(itemsNeedingCategoryConfirmation([item("iPad"), item("Teddy bear")], ["Electronics"])).toEqual([item("Teddy bear")]);
  });
  it("requires confirmation when the matching category is absent", () => {
    expect(itemsNeedingCategoryConfirmation([item("iPad")], ["Clothes"])).toEqual([item("iPad")]);
  });
  it("keeps an explicitly confirmed Other assignment without asking again", () => {
    expect(itemsNeedingCategoryConfirmation([{ ...item("Teddy bear"), category: "Other" }], ["Clothes"])).toEqual([]);
  });
  it("respects a user's manual category choice for electronics", () => {
    expect(categoryFor({ ...item("iPad"), category: "Clothes" }, ["Clothes", "Electronics"])).toBe("Clothes");
  });
  it("camping trips suggest a torch", () => {
    expect(suggestItems("", [], undefined, false, "camping")).toContain("Torch");
  });
  it("caravan trips suggest an awning and a hook-up lead", () => {
    const ideas = suggestItems("", [], undefined, false, "caravan");
    expect(ideas).toContain("Awning");
    expect(ideas).toContain("Electric hook-up lead");
  });
  it("sorts caravan gear into Camping gear rather than Other or Electronics", () => {
    const cats = ["Clothes", "Toiletries", "Electronics", "Documents", "Camping gear"];
    expect(categoryFor(item("Awning"), cats)).toBe("Camping gear");
    expect(categoryFor(item("Electric hook-up lead"), cats)).toBe("Camping gear");
  });
});

import { suggest as suggestA } from "@/lib/packing";
import { it as itA, expect as expectA } from "vitest";
itA("pool amenity suggests swim shorts and goggles", () => {
  const s = suggestA("", [], undefined, false, "hotel", ["pool"]);
  expectA(s).toContain("Swim shorts");
  expectA(s).toContain("Goggles");
});

import { suggest as suggestMore, IDEAS_PREVIEW } from "@/lib/packing";
import { it as itM, expect as expectM } from "vitest";
itM("offers more ideas than the on-screen preview so 'Show more' has something to reveal", () => {
  const s = suggestMore("", [], undefined, false, "camping", ["pool"]);
  expectM(IDEAS_PREVIEW).toBe(8);
  expectM(s.length).toBeGreaterThan(IDEAS_PREVIEW);
});
itM("a typed word narrows the ideas", () => {
  const s = suggestMore("torch", [], undefined, false, "camping", []);
  expectM(s.length).toBeGreaterThan(0);
  expectM(s.every((x) => x.toLowerCase().includes("torch"))).toBe(true);
});


import { categoriesForTrip } from "@/lib/packing";
import { it as itCat, expect as expectCat, describe as describeCat } from "vitest";

describeCat("categoriesForTrip", () => {
  itCat("picking Beach adds the Beach category and keeps existing ones", () => {
    const cats = categoriesForTrip("beach", ["Clothes", "Toiletries"]);
    expectCat(cats).toContain("Beach");
    expectCat(cats).toContain("Clothes");
    expectCat(cats).toContain("Toiletries");
  });
  itCat("picking Skiing adds the Ski category", () => {
    expectCat(categoriesForTrip("skiing")).toContain("Ski");
  });
  itCat("picking Camping keeps Camping gear and adds Health", () => {
    const cats = categoriesForTrip("camping");
    expectCat(cats).toContain("Camping gear");
    expectCat(cats).toContain("Health");
  });
  itCat("does not add a category twice", () => {
    const once = categoriesForTrip("beach", ["Beach"]);
    const twice = categoriesForTrip("beach", once);
    expectCat(twice.filter((c) => c === "Beach").length).toBe(1);
  });
  itCat("switching holiday type swaps the automatic categories out", () => {
    const cats = categoriesForTrip("beach", ["Clothes", "Toiletries", "Camping gear", "Health"]);
    expectCat(cats).not.toContain("Camping gear");
    expectCat(cats).not.toContain("Health");
    expectCat(cats).toContain("Beach");
  });
  itCat("a plain hotel trip has no camping gear", () => {
    expectCat(categoriesForTrip("hotel", [...DEFAULT_CATEGORIES_CAMPING])).not.toContain("Camping gear");
  });
  itCat("your own categories survive the switch", () => {
    const cats = categoriesForTrip("hotel", ["Clothes", "Snacks", "Beach"]);
    expectCat(cats).toContain("Snacks");
    expectCat(cats).not.toContain("Beach");
  });
});

const DEFAULT_CATEGORIES_CAMPING = ["Clothes", "Toiletries", "Electronics", "Documents", "Camping gear"];

import { it as itGrow, expect as expectGrow, describe as describeGrow } from "vitest";

describeGrow("clothing quantities keep growing with trip length", () => {
  itGrow("underwear and socks keep rising past 9 nights", () => {
    expectGrow(clothingFor(9, "warm").find((i) => i.name === "Underwear")?.qty).toBe(11);
    expectGrow(clothingFor(20, "warm").find((i) => i.name === "Underwear")?.qty).toBe(22);
    expectGrow(clothingFor(20, "warm").find((i) => i.name === "Socks")?.qty).toBe(22);
  });
  itGrow("tops, shorts and swimwear keep rising too", () => {
    expectGrow(clothingFor(20, "warm").find((i) => i.name === "T-shirts")?.qty).toBe(21);
    expectGrow(clothingFor(20, "warm").find((i) => i.name === "Shorts")?.qty).toBe(11);
    expectGrow(clothingFor(20, "warm").find((i) => i.name === "Swimwear")?.qty).toBe(6);
    expectGrow(clothingFor(20, "mild").find((i) => i.name === "Tops")?.qty).toBe(21);
    expectGrow(clothingFor(20, "cold").find((i) => i.name === "Thermal tops")?.qty).toBe(11);
  });
  itGrow("pyjamas keep growing and nothing stays clamped", () => {
    expectGrow(clothingFor(20, "warm").find((i) => i.name === "Pyjamas")?.qty).toBe(5);
    const maxQty = Math.max(...clothingFor(30, "warm").map((i) => i.qty));
    expectGrow(maxQty).toBeGreaterThan(10);
  });
  it("generated ideas drop bullets, repeats and anything already on the list", () => {
    const raw = "- Swim fins\n2. Snorkel mask\n\nPassport\nhttps://example.com\n\"Flip flops\"\nswim fins";
    expect(cleanGeneratedIdeas(raw, ["passport", "Snorkel Mask"])).toEqual(["Swim fins", "Flip flops"]);
  });
});

import { suggest, DEFAULT_CATEGORIES, AMENITIES } from "@/lib/packing";
import { it as itAbroad, expect as expectAbroad, describe as describeAbroad } from "vitest";

describeAbroad("the going abroad option", () => {
  itAbroad("offers a 'going abroad' choice in the holiday offers list", () => {
    expectAbroad(AMENITIES.some((a) => a.value === "abroad" && a.label.toLowerCase().includes("abroad"))).toBe(true);
  });
  itAbroad("ticking abroad puts passport, adapter and currency in the ideas", () => {
    const ideas = suggest("", [], undefined, false, "hotel", ["abroad"]);
    expectAbroad(ideas).toContain("Passport");
    expectAbroad(ideas).toContain("Travel adapter");
    expectAbroad(ideas).toContain("Foreign currency");
  });
  itAbroad("abroad kit sorts into Documents and Electronics, not Other", () => {
    const cats = DEFAULT_CATEGORIES;
    expectAbroad(categoryFor({ id: "1", name: "Foreign currency", qty: 1, packed: false }, cats)).toBe("Documents");
    expectAbroad(categoryFor({ id: "2", name: "Travel adapter", qty: 1, packed: false }, cats)).toBe("Electronics");
    expectAbroad(categoryFor({ id: "3", name: "Roaming eSIM", qty: 1, packed: false }, cats)).toBe("Electronics");
  });
});
