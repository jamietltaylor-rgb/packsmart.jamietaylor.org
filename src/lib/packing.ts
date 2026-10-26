export type Item = { id: string; name: string; qty: number; packed: boolean; category?: string | undefined };
export type Stop = { id: string; place: string; nights: number; weather?: WeatherSummary | undefined };
export type PackList = {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  nights: number;
  items: Item[];
  photoPath?: string | undefined;
  photoUrl?: string | undefined;
  weather?: WeatherSummary | undefined;
  categories?: string[] | undefined;
  tripType?: TripType | undefined;
  amenities?: string[] | undefined;
  /** More than one place on the same holiday. Empty/missing = a normal single-destination trip. */
  stops?: Stop[] | undefined;
};
export type WeatherSummary = {
  place: string;
  avgHigh: number;
  avgLow: number;
  rainyDays: number;
  source: "forecast" | "last-year";
  days?: WeatherDay[];
};
export type WeatherDay = { date: string; high: number; low: number; rain: number; code: number };
export function weatherLabel(code: number): string {
  if (code === 0) return "Sunny";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Foggy";
  if (code >= 95) return "Thunderstorms";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Snow";
  return "Rain";
}
export function addItems(items: Item[], additions: { name: string; qty: number }[]): Item[] {
  const result = items.map((item) => ({ ...item }));
  for (const addition of additions) {
    const name = addition.name.trim();
    if (!name) continue;
    const existing = result.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (existing) existing.qty = addition.qty;
    else result.push({ id: uid(), name, qty: addition.qty, packed: false });
  }
  return result;
}
export type Climate = "hot" | "warm" | "mild" | "cold";

export const uid = () => Math.random().toString(36).slice(2, 10);

export function climateFor(w?: WeatherSummary): Climate | undefined {
  if (!w) return undefined;
  if (w.avgHigh >= 26) return "hot";
  if (w.avgHigh >= 18) return "warm";
  if (w.avgHigh >= 9) return "mild";
  return "cold";
}

/** Clothing quantities based on trip length (days = nights + 1). */
export function clothingFor(nights: number, climate?: Climate): { name: string; qty: number }[] {
  const days = Math.max(1, nights + 1);
  const grow = (n: number) => Math.max(1, Math.round(n));
  const list = [
    { name: "Underwear", qty: grow(days + 1) },
    { name: "Socks", qty: grow(days + 1) },
    { name: "Pyjamas", qty: grow(Math.ceil(nights / 4)) },
  ];
  if (climate === "hot" || climate === "warm") {
    list.push(
      { name: "T-shirts", qty: grow(days) },
      { name: "Shorts", qty: grow(Math.ceil(days / 2)) },
      { name: "Swimwear", qty: grow(Math.ceil(days / 4)) },
      { name: "Sun hat", qty: 1 },
      { name: "Sunglasses", qty: 1 },
      { name: "Sandals", qty: 1 },
    );
    if (climate === "warm") list.push({ name: "Light jumper", qty: 1 });
  } else if (climate === "cold") {
    list.push(
      { name: "Thermal tops", qty: grow(Math.ceil(days / 2)) },
      { name: "Jumpers", qty: grow(Math.ceil(days / 3)) },
      { name: "Trousers", qty: grow(Math.ceil(days / 3)) },
      { name: "Winter coat", qty: 1 },
      { name: "Hat, scarf & gloves", qty: 1 },
      { name: "Warm boots", qty: 1 },
    );
  } else {
    list.push(
      { name: "Tops", qty: grow(days) },
      { name: "Jumpers", qty: grow(Math.ceil(days / 3)) },
      { name: "Trousers / jeans", qty: grow(Math.ceil(days / 3)) },
      { name: "Light jacket", qty: 1 },
      { name: "Comfy shoes", qty: 1 },
    );
  }
  return list;
}

/** True when the holiday visits more than one place. */
export const isMultiStop = (list: Pick<PackList, "stops">) => (list.stops?.length ?? 0) > 0;

export const totalNights = (stops: Stop[]) => stops.reduce((sum, s) => sum + Math.max(0, s.nights), 0);

/** "Rome → Florence → Venice" (blank stops are skipped). */
export const stopsLabel = (stops: Stop[]) => stops.map((s) => s.place.trim()).filter(Boolean).join(" → ");

/** The date each stop starts on: the trip's start date plus the nights spent at earlier stops. */
export function stopStartDates(startDate: string, stops: Stop[]): string[] {
  // A cleared or half-typed date input gives "" — return blanks instead of crashing the page.
  if (Number.isNaN(new Date(`${startDate}T12:00:00Z`).getTime())) return stops.map(() => "");
  let offset = 0;
  return stops.map((s) => {
    const d = new Date(`${startDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    offset += Math.max(0, s.nights);
    return d.toISOString().slice(0, 10);
  });
}

/** Climate used for suggestions: the weather of the place where you stay longest. */
export function dominantClimate(list: Pick<PackList, "weather" | "stops">): Climate | undefined {
  if (!isMultiStop(list)) return climateFor(list.weather);
  const withWeather = (list.stops ?? []).filter((s) => s.weather);
  const longest = withWeather.reduce<Stop | undefined>((best, s) => (!best || s.nights > best.nights ? s : best), undefined);
  return climateFor(longest?.weather);
}

/** Every different climate on the trip, so packing covers hot AND cold stops. */
export function tripClimates(list: Pick<PackList, "weather" | "stops">): Climate[] {
  const all = isMultiStop(list) ? (list.stops ?? []).map((s) => climateFor(s.weather)) : [climateFor(list.weather)];
  return [...new Set(all.filter((c): c is Climate => Boolean(c)))];
}

export function tripRainyDays(list: Pick<PackList, "weather" | "stops">): number {
  return isMultiStop(list) ? (list.stops ?? []).reduce((n, s) => n + (s.weather?.rainyDays ?? 0), 0) : (list.weather?.rainyDays ?? 0);
}

const BASICS = ["Underwear", "Socks", "Pyjamas"];

/**
 * Clothes for a trip with several stops: underwear, socks and pyjamas follow the whole trip length,
 * while weather clothes are worked out per stop (from the nights spent there) and then combined.
 */
export function clothingForStops(stops: Stop[]): { name: string; qty: number }[] {
  const total = totalNights(stops);
  const result = clothingFor(total).filter((c) => BASICS.includes(c.name));
  const extras = new Map<string, number>();
  for (const stop of stops) {
    const nights = Math.max(0, stop.nights);
    if (!nights) continue;
    // days = nights here, so travel days aren't counted twice when stops are combined
    for (const item of clothingFor(Math.max(0, nights - 1), climateFor(stop.weather)).filter((c) => !BASICS.includes(c.name))) {
      const have = extras.get(item.name);
      extras.set(item.name, have === undefined ? item.qty : have === 1 && item.qty === 1 ? 1 : have + item.qty);
    }
  }
  for (const [name, qty] of extras) result.push({ name, qty });
  return result;
}

export const SUGGESTIONS = [
  "Passport", "Phone charger", "Plug adapter", "Toothbrush", "Toothpaste", "Deodorant",
  "Shampoo", "Sun cream", "After sun", "Insect repellent", "Medication", "Plasters",
  "Headphones", "Book", "Power bank", "Travel pillow", "Wallet", "Travel insurance docs",
  "Boarding pass", "Hairbrush", "Razor", "Glasses / contacts", "Water bottle", "Snacks",
  "Umbrella", "Raincoat", "Camera", "Beach towel", "Flip flops", "Lip balm", "Hand cream",
  "Moisturiser", "Laptop", "Keys", "Earplugs", "Eye mask", "Day bag", "Hand sanitiser",
];

export const AMENITIES: { value: string; label: string; items: string[] }[] = [
  {
    value: "abroad",
    label: "✈️ Going abroad",
    items: [
      "Passport",
      "Passport copies",
      "Travel adapter",
      "Foreign currency",
      "Travel insurance",
      "Boarding passes",
      "Roaming eSIM",
      "Prescription medication",
    ],
  },
  { value: "pool", label: "🏊 Pool", items: ["Swim shorts", "Swimsuit", "Goggles", "Pool towel", "Flip flops", "Waterproof phone pouch", "Inflatable", "Swim hat"] },
  { value: "beach", label: "🏖️ Beach nearby", items: ["Beach towel", "Beach bag", "Snorkel", "Water shoes", "Sun hat", "Beach umbrella"] },
  { value: "spa", label: "🧖 Spa / sauna", items: ["Swimsuit", "Dressing gown", "Spa slippers"] },
  { value: "gym", label: "🏋️ Gym", items: ["Gym clothes", "Trainers", "Water bottle", "Sports socks"] },
  { value: "restaurant", label: "🍽️ Smart restaurant", items: ["Smart outfit", "Smart shoes"] },
  { value: "kitchen", label: "🍳 Kitchen", items: ["Tea bags", "Coffee", "Snacks", "Tea towel", "Washing-up liquid"] },
  { value: "kids-club", label: "🧸 Kids club", items: ["Kids' swimwear", "Kids' toys", "Colouring books"] },
  { value: "hot-tub", label: "🛁 Hot tub", items: ["Swimsuit", "Swim shorts", "Hair tie"] },
  { value: "bikes", label: "🚲 Bike hire", items: ["Cycling shorts", "Bike lock", "Padded gloves"] },
  { value: "hiking", label: "🥾 Hiking trails", items: ["Walking boots", "Rucksack", "Blister plasters", "Water bottle"] },
  { value: "wifi", label: "📶 Wi-Fi", items: ["Tablet", "Headphones"] },
  { value: "laundry", label: "🧺 Laundry", items: ["Laundry detergent", "Laundry bag"] },
];

export const IDEAS_PREVIEW = 8;
export function suggest(query: string, existing: string[], climate?: Climate, rainy = false, tripType: TripType = "hotel", amenities: string[] = []): string[] {
  const have = new Set(existing.map((e) => e.toLowerCase()));
  const amenityItems = AMENITIES.filter((a) => amenities.includes(a.value)).flatMap((a) => a.items);
  let pool = [...amenityItems, ...TRIP_EXTRAS[tripType], ...SUGGESTIONS, ...Object.values(TRIP_EXTRAS).flat(), ...AMENITIES.flatMap((a) => a.items)];
  if (rainy) pool = ["Umbrella", "Raincoat", ...pool];
  if (climate === "hot") pool = ["Sun cream", "After sun", "Beach towel", ...pool];
  if (climate === "cold") pool = ["Lip balm", "Hand cream", "Hand warmers", ...pool];
  pool = [...new Set(pool)].filter((p) => !have.has(p.toLowerCase()));
  const q = query.trim().toLowerCase();
  if (!q) return pool.slice(0, 30);
  return pool.filter((p) => p.toLowerCase().includes(q)).slice(0, 12);
}

export function cleanGeneratedIdeas(text: string, have: string[]): string[] {
  const known = new Set(have.map((h) => h.toLowerCase()));
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw
      .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
      .replace(/^["'“”]+|["'“”]+$/g, "")
      .trim();
    if (!line || line.length > 60 || /^https?:/i.test(line)) continue;
    const key = line.toLowerCase();
    if (known.has(key)) continue;
    known.add(key);
    out.push(line);
    if (out.length >= 12) break;
  }
  return out;
}

export type Place = { name: string; country?: string; region?: string; latitude: number; longitude: number };

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const safe = async <T,>(p: Promise<T>, fallback: T) => { try { return await p; } catch { return fallback; } };

async function openMeteo(q: string): Promise<Place[]> {
  const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en`).then((r) => r.json());
  return (g.results ?? []).map((r: any) => ({ name: r.name, country: r.country, region: r.admin1, latitude: r.latitude, longitude: r.longitude }));
}
async function photon(q: string): Promise<Place[]> {
  const g = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en&osm_tag=place`).then((r) => r.json());
  return (g.features ?? []).map((f: any) => ({ name: f.properties.name, country: f.properties.country, region: f.properties.state, latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] }));
}
async function nominatim(q: string): Promise<Place[]> {
  const g = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=en&featureType=settlement`).then((r) => r.json());
  return (g ?? []).map((r: any) => {
    const parts = String(r.display_name).split(", ");
    return { name: r.name || parts[0], country: parts[parts.length - 1], region: parts.length > 2 ? parts[1] : undefined, latitude: Number(r.lat), longitude: Number(r.lon) };
  });
}

/** Searches several place services. Returns an exact match if found, otherwise "did you mean" options. */
export async function findPlace(q: string): Promise<{ match?: Place; options: Place[] }> {
  const [a, b, c] = await Promise.all([safe(openMeteo(q), []), safe(photon(q), []), safe(nominatim(q), [])]);
  const all = [...a, ...b, ...c].filter((p) => p.name);
  const match = all.find((p) => norm(p.name) === norm(q));
  if (match) return { match, options: [] };
  const seen = new Set<string>();
  const options = all.filter((p) => {
    const k = `${norm(p.name)}|${norm(p.country ?? "")}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { options: options.slice(0, 8) };
}

export const placeLabel = (p: Place) => [p.name, p.region !== p.name ? p.region : undefined, p.country].filter(Boolean).join(", ");

export async function fetchWeather(loc: Place, startDate: string, nights: number): Promise<WeatherSummary> {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + nights);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const daysAhead = (start.getTime() - Date.now()) / 86400000;
  let url: string;
  let source: WeatherSummary["source"] = "forecast";
  const params = `latitude=${loc.latitude}&longitude=${loc.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto`;
  if (daysAhead >= -1 && daysAhead + nights < 15) {
    url = `https://api.open-meteo.com/v1/forecast?${params}&start_date=${fmt(start)}&end_date=${fmt(end)}`;
  } else {
    source = "last-year";
    const s = new Date(start); s.setFullYear(new Date().getFullYear() - 1);
    const e = new Date(s); e.setDate(e.getDate() + nights);
    url = `https://archive-api.open-meteo.com/v1/archive?${params}&start_date=${fmt(s)}&end_date=${fmt(e)}`;
  }
  const w = await fetch(url).then((r) => r.json());
  const hi: number[] = (w.daily?.temperature_2m_max ?? []).filter((n: number | null) => n != null);
  const lo: number[] = (w.daily?.temperature_2m_min ?? []).filter((n: number | null) => n != null);
  const rain: number[] = w.daily?.precipitation_sum ?? [];
  if (!hi.length) throw new Error("No weather data for those dates");
  const avg = (a: number[]) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
  return {
    place: [loc.name, loc.country].filter(Boolean).join(", "),
    avgHigh: avg(hi),
    avgLow: avg(lo),
    rainyDays: rain.filter((r) => (r ?? 0) > 1).length,
    source,
    days: (w.daily.time ?? []).map((_: string, index: number) => {
      const date = new Date(`${startDate}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + index);
      return { date: fmt(date), high: w.daily.temperature_2m_max[index], low: w.daily.temperature_2m_min[index], rain: rain[index] ?? 0, code: w.daily.weather_code?.[index] ?? 3 };
    }),
  };
}

export type TripType = "hotel" | "camping" | "caravan" | "beach" | "city" | "skiing" | "road-trip";
export const TRIP_TYPES: { value: TripType; label: string }[] = [
  { value: "hotel", label: "Hotel holiday" }, { value: "camping", label: "Camping" },
  { value: "caravan", label: "Caravan / motorhome" },
  { value: "beach", label: "Beach holiday" }, { value: "city", label: "City break" },
  { value: "skiing", label: "Skiing / snow" }, { value: "road-trip", label: "Road trip" },
];
export const TRIP_EXTRAS: Record<TripType, string[]> = {
  hotel: ["Phone charger", "Plug adapter", "Toiletry bag", "Smart outfit", "Booking confirmation"],
  camping: ["Torch", "Head torch", "Spare batteries", "Tent", "Sleeping bag", "Sleeping mat", "Camping pillow", "Camping stove", "Gas canister", "Matches / lighter", "Pots & pans", "Cutlery", "Camping chairs", "Cool box", "Mallet", "Spare tent pegs", "Bin bags", "Toilet roll", "Wet wipes", "Pocket knife", "First aid kit", "Walking boots", "Fleece", "Lantern", "Washing-up liquid", "Rope / washing line"],
  caravan: ["Awning", "Ground sheet", "Level ramps", "Electric hook-up lead", "Water carrier", "Water hose", "Waste water container", "Blue fluid", "Bed linen", "Fitted sheet", "Pillow", "Duvet", "Mop & bucket", "Tea towels", "Kitchen roll", "Bin bags", "Camping chairs", "Folding table", "Kettle", "Toaster", "Pots & pans", "Plates & bowls", "Cutlery", "Chopping board", "Spice kit", "Foil & cling film", "Cool box", "Torch", "Head torch", "Spare batteries", "First aid kit", "Insect repellent", "Gas bottle", "Mallet & pegs", "Wheel chocks", "Bike rack", "Airing rack", "Campsite booking confirmation"],
  beach: ["Beach towel", "Sun cream", "After sun", "Swimwear", "Snorkel", "Beach bag", "Waterproof phone case", "Flip flops", "Inflatable"],
  city: ["Comfy walking shoes", "Day bag", "Power bank", "City map", "Travel card", "Reusable water bottle"],
  skiing: ["Ski jacket", "Salopettes", "Ski goggles", "Ski gloves", "Thermal base layers", "Ski socks", "Helmet", "Hand warmers", "Lip balm"],
  "road-trip": ["Car charger", "Snacks", "Playlist", "Driving licence", "Sunglasses", "Travel sickness tablets", "Blanket", "Torch"],
};

export const DEFAULT_CATEGORIES = ["Clothes", "Toiletries", "Electronics", "Documents"];
/** Extra categories each holiday type automatically adds on top of the defaults. */
export const TRIP_CATEGORIES: Record<TripType, string[]> = {
  hotel: [],
  camping: ["Camping gear", "Health"],
  caravan: ["Camping gear", "Health"],
  beach: ["Beach"],
  city: [],
  skiing: ["Ski"],
  "road-trip": [],
};
/** All categories that come and go automatically with the holiday type. */
export const AUTO_TRIP_CATEGORIES = [...new Set(Object.values(TRIP_CATEGORIES).flat())];
/** Rebuilds the categories for a holiday type: keeps your own categories, swaps the type's own ones in and out. */
export function categoriesForTrip(tripType: TripType, existing?: string[]): string[] {
  const want = TRIP_CATEGORIES[tripType];
  const auto = AUTO_TRIP_CATEGORIES.map((c) => c.toLowerCase().trim());
  const kept = (existing ?? [...DEFAULT_CATEGORIES]).filter((c) => {
    const key = c.toLowerCase().trim();
    return !auto.includes(key) || want.some((w) => w.toLowerCase().trim() === key);
  });
  const merged = [...kept];
  for (const c of want) {
    if (!merged.some((x) => x.toLowerCase().trim() === c.toLowerCase().trim())) merged.push(c);
  }
  return merged;
}
export const OTHER = "Other";
const GROUPS: { names: string[]; words: string[] }[] = [
  { names: ["clothes", "clothing", "outfits", "wear"], words: ["underwear", "sock", "pyjama", "shirt", "short", "swim", "hat", "sunglass", "sandal", "jumper", "thermal", "trouser", "jean", "coat", "scarf", "glove", "boot", "tops", "jacket", "shoe", "flip flop", "fleece", "outfit", "salopette", "dress", "skirt", "hoodie", "bra", "legging", "raincoat"] },
  { names: ["toiletries", "wash bag", "washbag", "bathroom", "beauty"], words: ["tooth", "deodorant", "shampoo", "conditioner", "sun cream", "after sun", "razor", "hairbrush", "moisturiser", "lip balm", "hand cream", "sanitiser", "wipes", "toilet", "soap", "makeup", "toiletry", "comb", "perfume"] },
  { names: ["electronics", "electronic", "electrical", "devices", "technology", "tech", "gadgets", "chargers"], words: ["charger", "adapter", "adaptor", "headphone", "earphone", "earbud", "airpod", "power bank", "powerbank", "laptop", "notebook computer", "macbook", "chromebook", "camera", "gopro", "go pro", "drone", "phone", "iphone", "ipad", "ipod", "battery", "batteries", "tablet", "galaxy tab", "surface pro", "kindle", "e reader", "ereader", "kobo", "cable", "speaker", "smartwatch", "smart watch", "apple watch", "fitbit", "garmin", "fitness tracker", "nintendo", "switch", "steam deck", "playstation", "xbox", "console", "controller", "usb", "hdmi", "sd card", "memory card", "hard drive", "ssd", "hair dryer", "hairdryer", "straightener", "curling iron", "electric shaver", "electric razor", "electric toothbrush", "travel iron", "walkie talkie", "gps", "satnav", "sat nav", "hotspot", "router", "projector", "microphone", "monitor", "keyboard", "mouse", "portable fan", "electric fan", "esim", "sim", "roaming"] },
  { names: ["documents", "travel docs", "papers", "important"], words: ["passport", "insurance", "boarding", "ticket", "wallet", "keys", "licence", "booking", "visa", "money", "card", "map", "currency", "visa", "customs"] },
  { names: ["camping gear", "camping", "camp", "outdoor"], words: ["tent", "sleeping", "torch", "lantern", "stove", "gas", "matches", "lighter", "pots", "cutlery", "chair", "cool box", "mallet", "peg", "knife", "rope", "bin bag", "washing up", "mat", "awning", "ground sheet", "level ramp", "hook up", "hookup", "water carrier", "water hose", "waste water", "blue fluid", "mop", "bucket", "tea towel", "kitchen roll", "folding table", "airing rack", "drying rack", "bed linen", "fitted sheet", "duvet", "pillow", "wheel chock", "bike", "first aid", "repellent"] },
  { names: ["health", "medical", "first aid", "medicine"], words: ["medication", "plaster", "first aid", "tablets", "insect", "glasses", "contacts", "painkiller"] },
  { names: ["food", "snacks", "kitchen"], words: ["snack", "water bottle", "food", "drink", "tea", "coffee", "kettle", "toaster", "chopping board", "spice", "foil", "cling film", "plates", "bowls"] },
  { names: ["beach", "swimming"], words: ["beach", "snorkel", "inflatable", "towel"] },
  { names: ["ski", "skiing", "snow"], words: ["ski", "goggle", "helmet", "hand warmer"] },
];

/** Which of the user's categories an item belongs to; anything unmatched goes to "Other". */
export function categoryFor(item: Item, categories: string[]): string {
  if (item.category && (item.category === OTHER || categories.includes(item.category))) return item.category;
  const n = item.name.toLowerCase().replace(/[-_]/g, " ");
  const electronics = GROUPS[2];
  const electronicCategory = electronics && categories.find((c) => electronics.names.some((alias) => c.toLowerCase().trim() === alias || c.toLowerCase().trim().includes(alias)));
  if (electronics && electronicCategory && electronics.words.some((word) => new RegExp(`\\b${word}(?:s|es)?\\b`, "i").test(n))) return electronicCategory;
  for (const c of categories) {
    const cl = c.toLowerCase().trim();
    if (n.includes(cl) || cl.includes(n)) return c;
    const g = GROUPS.find((g) => g.names.some((x) => cl === x || cl.includes(x) || x.includes(cl)));
    if (g && g.words.some((w) => n.includes(w))) return c;
  }
  return OTHER;
}
export function groupItems(items: Item[], categories: string[]): { name: string; items: Item[] }[] {
  const groups = [...categories, OTHER].map((name) => ({ name, items: [] as Item[] }));
  for (const i of items) groups.find((g) => g.name === categoryFor(i, categories))?.items.push(i);
  return groups.filter((g) => g.items.length);
}

/** Previously confirmed Other items need not be confirmed again on quantity updates. */
export function itemsNeedingCategoryConfirmation(items: Item[], categories: string[]): Item[] {
  return items.filter((item) => item.category !== OTHER && categoryFor(item, categories) === OTHER);
}
