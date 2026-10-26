import type { Climate, TripType } from "@/lib/packing";

/**
 * Rule-based "Generate more ideas" — no AI, no API keys, works offline.
 *
 * Ideas live in themed pools. generateIdeas() collects the pools that match the
 * trip (holiday type, weather, amenities, length), puts the most relevant first,
 * removes anything already on the list, and returns the next batch. Because the
 * app feeds the ideas it has already shown back in as `have`, pressing the
 * button again always gives a fresh batch until the pools run dry.
 */

export type IdeaContext = {
  tripType: TripType;
  climate?: Climate | undefined;
  /** For trips with several stops: every climate on the trip. Takes priority over `climate`. */
  climates?: Climate[] | undefined;
  nights: number;
  rainy: boolean;
  /** Amenity values from AMENITIES, e.g. "pool", "hiking". */
  amenities: string[];
  /** Everything already on the list or already suggested. */
  have: string[];
  /** Used only to shuffle each pool the same way every time for the same trip. */
  seed?: string | undefined;
};

const TRIP_POOLS: Record<TripType, string[]> = {
  hotel: [
    "Evening bag", "Smart casual outfit", "Travel steamer", "Slippers", "Dressing gown", "Tipping cash",
    "Spare hangers", "Laundry bag", "Travel clock", "Packable tote bag", "Room-key holder",
  ],
  camping: [
    "Tent repair kit", "Groundsheet", "Camping towel", "Solar charger", "Waterproof matches", "Fire lighters",
    "Midge net", "Folding spade", "Camping kettle", "Washing-up bowl", "Dish brush", "Sleeping bag liner",
    "Hot water bottle", "Camping table", "Wellies", "Waterproof trousers", "Map & compass", "Whistle",
    "Hammer", "Water purification tablets", "Marshmallows", "Spare tent poles", "Dry bag",
  ],
  caravan: [
    "Hitch lock", "Wheel clamp", "Spare bulbs", "Spare fuses", "Gas regulator", "Fire extinguisher", "Fly screen",
    "Door mat", "Caravan step", "Windbreak", "Cable ties", "Duct tape", "Toilet chemicals", "Rubber gloves",
    "Dustpan & brush", "Tin opener", "Bottle opener", "Corkscrew", "Oven gloves", "Towing mirrors",
    "Tyre pressure gauge", "Spare wheel", "Jack", "Colander",
  ],
  beach: [
    "Beach mat", "Windbreak", "Cool bag", "Rash vest", "Bucket & spade", "Beach shoes", "Sarong", "Frisbee",
    "Beach tent", "Bodyboard", "Hair ties", "Spare swimwear", "Aloe vera gel", "Beach games", "Dry bag",
    "Sand-free towel", "Reef-safe sun cream",
  ],
  city: [
    "Foldable tote bag", "Portable charger", "Guidebook", "Contactless card", "Rain poncho", "Blister plasters",
    "Crossbody bag", "Anti-theft bag", "Sightseeing pass", "Compact umbrella", "Pocket tissues",
    "Reusable cutlery", "Comfy socks", "Offline maps", "Museum tickets",
  ],
  skiing: [
    "Ski pass", "Ski lock", "Neck gaiter", "Goggle cloth", "Boot bag", "Après-ski boots", "Insulated mittens",
    "Waterproof trousers", "Chalet slippers", "Slope backpack", "Spare goggle lens", "High SPF sun cream",
    "SPF lip balm", "Ski insurance", "Thermal socks",
  ],
  "road-trip": [
    "Phone mount", "Roadside kit", "Jump leads", "Warning triangle", "Reflective jacket", "Paper map", "Travel mug",
    "Car first aid kit", "Audiobooks", "Games for passengers", "Cash for tolls", "Windscreen cleaner",
    "Sunshade", "Cool bag", "Bin bags", "Wet wipes", "Tyre pressure gauge", "Pillow",
  ],
};

const CLIMATE_POOLS: Record<Climate, string[]> = {
  hot: [
    "High SPF sun cream", "Cooling spray", "Cap", "Aloe vera gel", "Electrolyte sachets", "Linen shirt",
    "Portable fan", "Insect bite cream", "SPF lip balm", "Light scarf", "Reusable water bottle", "Sunglasses case",
  ],
  warm: ["Light cardigan", "Thin scarf", "Sun cream", "Sunglasses", "Sandals", "Reusable water bottle", "Cap"],
  mild: ["Packable raincoat", "Light scarf", "Layering top", "Compact umbrella", "Comfy shoes"],
  cold: [
    "Thermal socks", "Hand warmers", "Beanie hat", "Snood", "Waterproof gloves", "Thermal leggings", "Moisturiser",
    "Lip balm", "Flask", "Fleece-lined jacket", "Thick tights", "Heat pad",
  ],
};

const RAIN_POOL = [
  "Umbrella", "Waterproof jacket", "Waterproof shoes", "Spare shoes", "Dry bag", "Rucksack rain cover",
  "Quick-dry towel", "Plastic bags for wet clothes", "Waterproof phone pouch",
];

const AMENITY_POOLS: Record<string, string[]> = {
  abroad: [
    "Visa documents", "Phrasebook", "Travel money card", "GHIC card", "Copy of travel insurance", "Local SIM card",
    "Emergency contact list", "Spare passport photos",
  ],
  pool: ["Swim cap", "Armbands", "Pool shoes", "Towel clip", "Waterproof bag", "Kids' floats", "Spare swimwear"],
  beach: ["Beach shelter", "Sand toys", "Cool bag", "Beach shoes"],
  spa: ["Spa towel", "Hair band", "Hair mask", "Spare underwear", "Reusable bag for wet things"],
  gym: ["Gym towel", "Resistance bands", "Gym bag", "Shaker bottle", "Wireless earbuds", "Sports bra", "Skipping rope"],
  restaurant: ["Smart handbag", "Dress shirt", "Tie", "Jewellery", "Stain remover pen", "Pocket perfume"],
  kitchen: [
    "Washing-up sponge", "Oil & seasoning", "Kitchen roll", "Foil", "Cling film", "Sandwich bags", "Tin opener",
    "Oven gloves", "Bin bags",
  ],
  "kids-club": ["Name labels", "Spare kids' clothes", "Kids' sun hat", "Kids' medicine", "Comfort toy", "Wet bag"],
  "hot-tub": ["Robe", "Slippers", "Waterproof phone pouch", "Spare swimwear"],
  bikes: ["Bike helmet", "Puncture repair kit", "Bike pump", "Cycling gloves", "Hi-vis vest", "Bike lights", "Padded shorts"],
  hiking: [
    "Trekking poles", "Hiking socks", "Waterproof jacket", "Map & compass", "Head torch", "Energy bars", "Whistle",
    "Water bladder", "Rucksack rain cover", "Power bank",
  ],
  wifi: ["Laptop charger", "E-reader", "Tablet charger", "Headphones"],
  laundry: ["Travel washing line", "Stain remover", "Laundry pods", "Pegs", "Coins for machines", "Fabric softener sheets"],
};

const SHORT_TRIP_POOL = ["Travel-size toiletries", "Weekend bag", "Packable tote bag"];
const LONG_TRIP_POOL = ["Laundry bag", "Travel wash", "Laundry pods", "Spare shoes", "Extra medication", "Spare glasses"];
const VERY_LONG_TRIP_POOL = ["Spare toiletries", "Sewing kit", "Spare charger cable", "Extra underwear", "Nail clippers"];

/** Handy things people often forget, whatever the trip. */
const GENERAL_POOL = [
  "Luggage tags", "Luggage lock", "Packing cubes", "Zip-lock bags", "Reusable shopping bag", "Liquids bag for hand luggage",
  "Spare charger cable", "Multi-plug extension", "Phone case", "Tissues", "Paracetamol", "Antihistamines",
  "Travel sickness tablets", "Cash", "Photocopies of documents", "Pen", "Notepad", "Playing cards", "Portable speaker",
  "Reusable water bottle", "Neck pillow", "Eye mask", "Earplugs", "Throat sweets", "Antibacterial wipes",
  "Safety pins", "Sewing kit", "Tweezers", "Nail clippers", "Spare glasses", "House keys", "Dry bag", "Face masks",
];

function tidy(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\band\b/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singular(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function key(name: string): string {
  return tidy(name).split(" ").map(singular).join(" ");
}

/** True when `candidate` is the same as, or a close variant of, something already known. */
function alreadyCovered(candidate: string, known: string[]): boolean {
  const c = key(candidate);
  return known.some((k) => k === c || (k.length >= 5 && c.length >= 5 && (k.includes(c) || c.includes(k))));
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffled<T>(items: T[], seed: string): T[] {
  let state = hashSeed(seed) || 1;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const a = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = a;
  }
  return copy;
}

/** Returns up to `limit` new ideas that aren't already covered by `ctx.have`. */
export function generateIdeas(ctx: IdeaContext, limit = 12): string[] {
  const seed = ctx.seed ?? `${ctx.tripType}|${ctx.nights}`;
  const pools: string[][] = [TRIP_POOLS[ctx.tripType]];
  if (ctx.rainy) pools.push(RAIN_POOL);
  for (const climate of ctx.climates ?? (ctx.climate ? [ctx.climate] : [])) pools.push(CLIMATE_POOLS[climate]);
  for (const amenity of ctx.amenities) {
    const pool = AMENITY_POOLS[amenity];
    if (pool) pools.push(pool);
  }
  if (ctx.nights <= 2) pools.push(SHORT_TRIP_POOL);
  if (ctx.nights >= 6) pools.push(LONG_TRIP_POOL);
  if (ctx.nights >= 13) pools.push(VERY_LONG_TRIP_POOL);
  pools.push(GENERAL_POOL);

  // Interleave the pools so a batch mixes themes (e.g. a camping idea, then a rain idea, then a general one)
  // instead of exhausting one pool before the next.
  const lanes = pools.map((pool, index) => shuffled(pool, `${seed}|${index}`));
  const known = ctx.have.map(key);
  const out: string[] = [];
  const longest = Math.max(...lanes.map((lane) => lane.length));
  for (let i = 0; i < longest && out.length < limit; i++) {
    for (const lane of lanes) {
      const item = lane[i];
      if (!item || alreadyCovered(item, known)) continue;
      known.push(key(item));
      out.push(item);
      if (out.length >= limit) break;
    }
  }
  return out;
}
