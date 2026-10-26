import { describe, expect, it } from "vitest";
import { generateIdeas, type IdeaContext } from "@/lib/packing-ideas";

const base: IdeaContext = {
  tripType: "camping",
  climate: "cold",
  nights: 7,
  rainy: true,
  amenities: ["hiking", "laundry"],
  have: ["Tent", "Sleeping bag", "Torch"],
};

describe("generateIdeas", () => {
  it("returns a full batch of new ideas without needing any AI", () => {
    const ideas = generateIdeas(base);
    expect(ideas).toHaveLength(12);
    expect(new Set(ideas.map((i) => i.toLowerCase())).size).toBe(12);
  });

  it("never repeats what is already on the list, including close variants", () => {
    const ideas = generateIdeas({ ...base, have: ["Tents", "sleeping bags", "Bucket and spade", "Waterproof jacket"] }, 200);
    const lower = ideas.map((i) => i.toLowerCase());
    expect(lower).not.toContain("tent");
    expect(lower).not.toContain("waterproof jacket");
    expect(generateIdeas({ ...base, tripType: "beach", have: ["Bucket and spade"] }, 200)).not.toContain("Bucket & spade");
  });

  it("gives a fresh batch each time the previous ideas are fed back in", () => {
    const first = generateIdeas(base);
    const second = generateIdeas({ ...base, have: [...base.have, ...first] });
    expect(second.length).toBeGreaterThan(0);
    expect(second.filter((i) => first.includes(i))).toEqual([]);
  });

  it("matches the trip: ski ideas for skiing, rain gear only when it is rainy", () => {
    const ski = generateIdeas({ tripType: "skiing", nights: 5, rainy: false, amenities: [], have: [] }, 200);
    expect(ski).toContain("Ski pass");
    expect(ski).not.toContain("Umbrella");
    const wet = generateIdeas({ tripType: "city", nights: 2, rainy: true, amenities: [], have: [] }, 200);
    expect(wet).toContain("Umbrella");
  });

  it("eventually runs out instead of looping forever", () => {
    let have: string[] = [];
    for (let i = 0; i < 50; i++) {
      const next = generateIdeas({ tripType: "city", nights: 1, rainy: false, amenities: [], have });
      if (!next.length) return;
      have = [...have, ...next];
    }
    throw new Error("generateIdeas never ran out of ideas");
  });
});
