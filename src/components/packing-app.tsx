import { useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { listsOptions, saveLists, uploadPhoto } from "@/lib/cloud-packing";
import { supabase } from "@/integrations/supabase/client";
import { InstallInstructions } from "./install-instructions";
import { StopsEditor, WeatherCard } from "./stops-editor";
import { SettingsPanel } from "./settings-panel";
import { applyTheme, loadTheme, saveTheme, type ThemeChoice } from "@/lib/theme";
import { Camera, ImagePlus, Trash2, LogOut, Plus, Check, ChevronDown, ChevronUp, Sparkles, ListChecks, SlidersHorizontal } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  type PackList,
  addItems,
  clothingFor,
  clothingForStops,
  dominantClimate,
  isMultiStop,
  stopsLabel,
  totalNights,
  tripClimates,
  tripRainyDays,
  type Stop,
  fetchWeather,
  findPlace,
  placeLabel,
  type Place,
  suggest,
  groupItems,
  itemsNeedingCategoryConfirmation,
  type Item,
  DEFAULT_CATEGORIES,
  categoriesForTrip,
  AUTO_TRIP_CATEGORIES,
  IDEAS_PREVIEW,
  OTHER,
  TRIP_TYPES,
  AMENITIES,
  type TripType,
  uid,
} from "@/lib/packing";
import { generateIdeas } from "@/lib/packing-ideas";

export function PackingApp() {
  const { data: saved } = useSuspenseQuery(listsOptions);
  const [lists, setListState] = useState<PackList[]>(saved);
  const listsRef = useRef(saved);
  const [activeId, setActiveId] = useState<string | null>(saved[0]?.id ?? null);
  const [saveState, setSaveState] = useState("All changes saved");
  const [saveError, setSaveError] = useState("");
  const [tab, setTab] = useState<"trips" | "settings">("trips");
  const [theme, setTheme] = useState<ThemeChoice>({});
  const changeTheme = (next: ThemeChoice) => { setTheme(next); saveTheme(next); applyTheme(next); };
  const [legacy, setLegacy] = useState<PackList[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setLists = (next: PackList[] | ((current: PackList[]) => PackList[])) => {
    const previous = listsRef.current;
    const value = typeof next === "function" ? next(previous) : next;
    const removed = previous.filter(l => !value.some(n => n.id === l.id)).map(l => l.id);
    listsRef.current = value;
    setListState(value);
    pending.current += 1;
    setSaveState("Saving…");
    queue.current = queue.current.catch(() => {}).then(async () => {
      try {
        await saveLists(value, removed);
        queryClient.setQueryData(listsOptions.queryKey, value);
        setSaveError("");
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Couldn't save your changes. Please retry.");
      } finally {
        pending.current -= 1;
        if (!pending.current) setSaveState("All changes saved");
      }
    });
  };
  useEffect(() => { setTheme(loadTheme()); }, []);
  useEffect(() => {
    try { setLegacy(JSON.parse(localStorage.getItem("pack-smart-lists") || "[]")); } catch {}
    const preventLoss = (event: BeforeUnloadEvent) => {
      if (pending.current) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, []);
  const signOut = async () => {
    await queue.current;
    if (saveError) return;
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  };

  const active = lists.find((l) => l.id === activeId);
  const update = (patch: Partial<PackList>) =>
    setLists((ls) => ls.map((l) => (l.id === activeId ? { ...l, ...patch } : l)));

  const newList = () => {
    const l: PackList = {
      id: crypto.randomUUID(),
      name: `Trip ${lists.length + 1}`,
      destination: "",
      startDate: new Date().toISOString().slice(0, 10),
      nights: 5,
      items: [],
    };
    setLists([...lists, l]);
    setActiveId(l.id);
  };

  return (
    <div className="min-h-dvh font-sans">
      <header className="bg-sunset text-primary-foreground">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-6 md:py-8 lg:max-w-6xl">
          <div>
          <h1 className="font-display text-3xl font-extrabold md:text-5xl">Pack Smart<span className="classic-only"> ✈️</span></h1>
          <p className="mt-2 opacity-90">Holiday packing lists that know what the weather's doing.</p>
          </div><Button variant="secondary" onClick={signOut} disabled={pending.current > 0 || Boolean(saveError)}><LogOut />Sign out</Button>
        </div>
      </header>
      <nav aria-label="Sections" className="border-b border-border">
        <div className="mx-auto flex max-w-5xl gap-1 px-6 max-md:px-0 lg:max-w-6xl">
          {(["trips", "settings"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-current={tab === t ? "page" : undefined}
              onClick={() => setTab(t)}
              className={`flex items-center border-b-2 px-4 py-3 text-sm font-medium transition-colors max-md:h-14 max-md:flex-1 max-md:flex-col max-md:justify-center max-md:gap-0.5 max-md:border-b-0 max-md:border-t-2 max-md:px-2 max-md:py-1 max-md:text-xs ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t === "trips" ? <ListChecks className="size-5 md:hidden" aria-hidden="true" /> : <SlidersHorizontal className="size-5 md:hidden" aria-hidden="true" />}
              {t === "trips" ? "My trips" : "Settings"}
            </button>
          ))}
        </div>
      </nav>

      {tab === "settings" ? (
        <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8 lg:max-w-6xl">
          <SettingsPanel theme={theme} onChange={changeTheme} />
        </main>
      ) : (
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr] md:px-6 md:py-8 lg:max-w-6xl lg:grid-cols-[260px_1fr]">
        <aside className="min-w-0 space-y-2 md:sticky md:top-4 md:self-start">
          <p role="status" className="text-xs text-muted-foreground">{saveError ? "Changes not saved" : saveState}</p>
          {saveError && <div role="alert" className="text-sm text-destructive">{saveError}<Button variant="outline" onClick={() => setLists([...listsRef.current])}>Retry saving</Button></div>}
          {legacy.length > 0 && <Button variant="outline" className="h-auto w-full whitespace-normal" onClick={() => { const imported = legacy.map(l => ({ ...l, id: crypto.randomUUID() })); setLists([...lists, ...imported]); setLegacy([]); localStorage.removeItem("pack-smart-lists"); }}>Import {legacy.length} lists from this device</Button>}
          <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          <Button onClick={newList} className="h-auto w-full max-md:w-auto max-md:shrink-0 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground shadow-card hover:opacity-90">
            + New list
          </Button>
          {lists.map((l) => {
            const done = l.items.filter((i) => i.packed).length;
            return (
              <Button
                variant="outline"
                key={l.id}
                onClick={() => setActiveId(l.id)}
                className={`h-auto w-full max-md:w-auto max-md:max-w-[14rem] max-md:shrink-0 justify-start whitespace-normal rounded-xl border px-4 py-3 text-left transition ${l.id === activeId ? "border-primary bg-card shadow-card" : "border-border bg-muted hover:bg-card"}`}
              >
                {l.photoUrl && <img src={l.photoUrl} alt="" className="size-12 shrink-0 rounded-lg object-cover" />}<div className="min-w-0"><div className="break-words font-medium">{l.name}</div>
                <div className="text-xs text-muted-foreground">
                  {l.destination || "No destination"} · {done}/{l.items.length} packed
                </div></div>
              </Button>
            );
          })}
          </div>
        </aside>

        <section className="min-w-0">
          {active ? (
            <ListEditor
              key={active.id}
              list={active}
              update={update}
              remove={() => {
                const rest = lists.filter((l) => l.id !== active.id);
                setLists(rest);
                setActiveId(rest[0]?.id ?? null);
              }}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              Make your first packing list to get started.
            </div>
          )}
        </section>
      </main>
      )}
      <InstallInstructions />
    </div>
  );
}

function ListEditor({ list, update, remove }: { list: PackList; update: (p: Partial<PackList>) => void; remove: () => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<Place[] | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [ask, setAsk] = useState<{ title: string; action: string; run: () => void } | null>(null);
  const confirm = (title: string, action: string, run: () => void) => setAsk({ title, action, run });
  const [popped, setPopped] = useState<string | null>(null);
  const photo = async (file?: File) => {
    if (!file) return;
    setPhotoBusy(true); setError("");
    try { update(await uploadPhoto(file, list.id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't upload this photo."); }
    finally { setPhotoBusy(false); }
  };
  const climate = dominantClimate(list);
  const multi = isMultiStop(list);
  const stopsKey = (list.stops ?? []).map((s) => `${s.place}:${s.nights}:${s.weather?.avgHigh ?? ""}`).join("|");
  const names = list.items.map((i) => i.name);
  const ideas = useMemo(() => suggest(query, names, climate, tripRainyDays(list) > 0, list.tripType ?? "hotel", list.amenities ?? []), [query, names.join(), climate, list.weather, list.tripType, (list.amenities ?? []).join()]);
  const clothes = multi ? clothingForStops(list.stops ?? []) : clothingFor(list.nights, climate);
  const categories = list.categories ?? DEFAULT_CATEGORIES;
  const [newCat, setNewCat] = useState("");
  const [showAllIdeas, setShowAllIdeas] = useState(false);
  const [moreIdeas, setMoreIdeas] = useState<string[]>([]);
  const [ideasNote, setIdeasNote] = useState("");
  const allIdeas = useMemo(
    () => [...ideas, ...moreIdeas.filter((x) => !ideas.some((i) => i.toLowerCase() === x.toLowerCase()))],
    [ideas, moreIdeas],
  );
  useEffect(() => {
    setMoreIdeas([]);
    setIdeasNote("");
  }, [list.destination, list.tripType, list.nights, list.weather, stopsKey, (list.amenities ?? []).join()]);
  const generateMore = () => {
    const fresh = generateIdeas({
      tripType: list.tripType ?? "hotel",
      climate,
      climates: tripClimates(list),
      nights: list.nights,
      rainy: tripRainyDays(list) > 0,
      amenities: list.amenities ?? [],
      have: [...names, ...allIdeas],
      seed: `${list.id}|${list.destination}`,
    });
    if (!fresh.length) {
      setIdeasNote("That's all the ideas we have for this trip — you can still add your own in the box above.");
      return;
    }
    setIdeasNote("");
    setMoreIdeas((prev) => [...prev, ...fresh.filter((f) => !prev.some((p) => p.toLowerCase() === f.toLowerCase()))]);
    setShowAllIdeas(true);
  };
  const [pendingAdd, setPendingAdd] = useState<{ items: Item[]; choices: Record<string, string> } | null>(null);
  const addCategory = () => { const c = newCat.trim(); if (c && c !== OTHER && !categories.some((x) => x.toLowerCase() === c.toLowerCase())) update({ categories: [...categories, c] }); setNewCat(""); };

  const addBatch = (additions: { name: string; qty: number }[]) => {
    const items = addItems(list.items, additions);
    const addedNames = new Set(additions.map((item) => item.name.trim().toLowerCase()));
    const unmatched = itemsNeedingCategoryConfirmation(items.filter((item) => addedNames.has(item.name.toLowerCase())), categories);
    if (unmatched.length) {
      setPendingAdd({ items, choices: Object.fromEntries(unmatched.map((item) => [item.id, OTHER])) });
      return;
    }
    update({ items });
    setQuery("");
  };
  const add = (name: string, qty = 1) => {
    if (name.trim()) addBatch([{ name, qty }]);
  };

  const loadWeather = async (place: Place) => {
    setLoading(true);
    setError("");
    setOptions(null);
    try {
      update({ weather: await fetchWeather(place, list.startDate, list.nights) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't get the weather");
    }
    setLoading(false);
  };

  const checkWeather = async () => {
    if (!list.destination.trim()) return setError("Add where you're going first");
    setLoading(true);
    setError("");
    setOptions(null);
    const { match, options } = await findPlace(list.destination);
    if (match) return loadWeather(match);
    setLoading(false);
    if (options.length) setOptions(options);
    else setError("We couldn't find anywhere with that name. Try checking the spelling or adding the country.");
  };

  const startMulti = () => {
    const stops: Stop[] = [
      { id: uid(), place: list.destination, nights: Math.max(1, list.nights), weather: list.weather },
      { id: uid(), place: "", nights: 2 },
    ];
    update({ stops, nights: totalNights(stops), destination: stopsLabel(stops), weather: undefined });
  };

  const addRef = useRef<HTMLInputElement>(null);
  // Computer: press "/" anywhere to jump to the add-an-item box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      e.preventDefault();
      addRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const field = "w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring";
  const packedCount = list.items.filter((i) => i.packed).length;
  const packedPct = list.items.length ? Math.round((packedCount / list.items.length) * 100) : 0;


  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <input aria-label="List name" className="min-w-0 flex-1 bg-transparent font-display text-2xl font-semibold outline-none" value={list.name} onChange={(e) => update({ name: e.target.value })} />
          <Button variant="ghost" size="icon" title="Delete this list" aria-label="Delete this list" onClick={() => confirm("Delete this trip and its packing list?", "Delete", remove)}><Trash2 /></Button>
        </div>
        {list.photoUrl && <img src={list.photoUrl} alt={`Photo for ${list.name}`} className="mt-4 aspect-[16/7] w-full rounded-lg object-cover" />}
        <div className="mt-4 flex flex-wrap gap-2">
          <input hidden ref={camera} type="file" accept="image/*" capture="environment" onChange={e => { void photo(e.target.files?.[0]); e.target.value = ""; }} />
          <input hidden ref={gallery} type="file" accept="image/*" onChange={e => { void photo(e.target.files?.[0]); e.target.value = ""; }} />
          <Button variant="outline" disabled={photoBusy} onClick={() => camera.current?.click()}><Camera />Take photo</Button>
          <Button variant="outline" disabled={photoBusy} onClick={() => gallery.current?.click()}><ImagePlus />{photoBusy ? "Uploading…" : "Choose photo"}</Button>
          {list.photoPath && <Button variant="ghost" onClick={() => confirm("Remove this photo?", "Remove", () => update({ photoPath: undefined, photoUrl: undefined }))}>Remove photo</Button>}
        </div>
        <label className="mt-4 block text-sm">Type of holiday
          <select className={field} value={list.tripType ?? "hotel"} onChange={(e) => { const t = e.target.value as TripType; const next = categoriesForTrip(t, categories); const dropped = categories.filter((c) => !next.includes(c) && AUTO_TRIP_CATEGORIES.includes(c)); update({ tripType: t, categories: next, items: dropped.length ? list.items.map((i) => (i.category && dropped.includes(i.category) ? { ...i, category: undefined } : i)) : list.items }); }}>
            {TRIP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <div className="mt-4 text-sm">What does your holiday have?
          <div className="mt-2 flex flex-wrap gap-2">
            {AMENITIES.map((a) => {
              const on = (list.amenities ?? []).includes(a.value);
              return (
                <button key={a.value} type="button" aria-pressed={on}
                  onClick={() => update({ amenities: on ? (list.amenities ?? []).filter((v) => v !== a.value) : [...(list.amenities ?? []), a.value] })}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"}`}>
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
        {multi ? (
          <StopsEditor list={list} update={update} field={field} confirm={confirm} />
        ) : (
          <>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Where to?
            <input className={field} placeholder="e.g. Barcelona" value={list.destination} onChange={(e) => update({ destination: e.target.value, weather: undefined })} />
          </label>
          <label className="text-sm">Leaving on
            <input type="date" className={field} value={list.startDate} onChange={(e) => update({ startDate: e.target.value, weather: undefined })} />
          </label>
          <label className="text-sm">Nights away ({list.nights + 1} days)
            <input type="number" className={field} placeholder="e.g. 7" value={list.nights === 0 ? "" : list.nights} onChange={(e) => update({ nights: e.target.value === "" ? 0 : Number(e.target.value), weather: undefined })} />
          </label>
        </div>
        <Button variant="ghost" onClick={startMulti} className="mt-2 px-0 text-sm underline-offset-4 hover:underline"><Plus />Visiting more than one place?</Button>
        <Button variant="secondary" onClick={checkWeather} disabled={loading} className="mt-4 rounded-lg bg-secondary px-4 py-2 font-medium text-secondary-foreground hover:opacity-90 disabled:opacity-60">
          {loading ? "Checking…" : "Check the weather"}
        </Button>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        {options && (
          <div className="mt-4 rounded-xl border border-border bg-muted p-4">
            <div className="font-medium">Did you mean…</div>
            <div className="mt-2 flex flex-col gap-1">
              {options.map((o) => (
                <Button
                  variant="ghost"
                  key={`${o.latitude},${o.longitude}`}
                  onClick={() => { update({ destination: o.name }); loadWeather(o); }}
                  className="h-auto justify-start whitespace-normal rounded-lg px-3 py-2 text-left hover:bg-card"
                >
                  <span className="classic-only">📍 </span>{placeLabel(o)}
                </Button>
              ))}
            </div>
          </div>
        )}
        {list.weather && <WeatherCard weather={list.weather} climate={climate} />}
          </>
        )}
      </div>

      <div className="border-b border-border pb-6">
        <h2 className="font-display text-xl font-semibold">Clothes you'll need</h2>
        <p className="text-sm text-muted-foreground">{climate ? "Based on the weather and" : "Check the weather for better tips. Based on"} {list.nights} nights away.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {clothes.map((c) => (
            <Button variant="outline" key={c.name} onClick={() => add(c.name, c.qty)} className="h-11 rounded-lg border border-border bg-muted px-3 py-1 text-sm text-foreground hover:border-primary">
              + {c.qty}× {c.name}
            </Button>
          ))}
          <Button onClick={() => confirm(`Add all ${clothes.length} clothing items to your list?`, "Add all", () => addBatch(clothes))} className="rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground">
            Add all
          </Button>
        </div>
      </div>

      <div className="border-b border-border pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-xl font-semibold">Your list</h2><Button variant="ghost" disabled={!list.items.length} onClick={() => confirm("Delete all items from this packing list?", "Delete all", () => update({ items: [] }))}><Trash2 />Delete all</Button></div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Packed so far</span>
            <span className="font-display text-lg font-semibold tabular-nums">{packedPct}%</span>
          </div>
          <div role="progressbar" aria-valuenow={packedPct} aria-valuemin={0} aria-valuemax={100} aria-label="How much of your list you have packed" className="mt-1 h-3 w-full overflow-hidden rounded-full border border-border bg-muted">
            <div className="h-full rounded-full bg-foliage transition-[width] duration-500 ease-out" style={{ width: `${packedPct}%` }} />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{!list.items.length ? "Nothing on your list yet" : packedPct === 100 ? "Everything's packed — have a great trip!" : `${packedCount} of ${list.items.length} ${list.items.length === 1 ? "item" : "items"} packed`}</div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); add(query); }} className="add-bar mt-3 flex gap-2">
          <input ref={addRef} aria-label="Add an item" className={`${field} min-w-0`} placeholder="Add an item…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button type="submit" className="h-auto rounded-lg bg-primary px-4 font-medium text-primary-foreground">Add</Button>
        </form>
        {allIdeas.length > 0 && (
          <div className="mt-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">You might want</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {(showAllIdeas ? allIdeas : allIdeas.slice(0, IDEAS_PREVIEW)).map((s) => (
                <Button variant="outline" key={s} onClick={() => add(s)} className="h-11 rounded-lg border border-dashed border-secondary px-3 py-1 text-sm text-secondary hover:bg-muted">+ {s}</Button>
              ))}
            </div>
            {allIdeas.length > IDEAS_PREVIEW && (
              <Button variant="ghost" onClick={() => setShowAllIdeas((v) => !v)} className="mt-2 h-auto px-2 text-sm font-medium text-primary">
                {showAllIdeas ? <ChevronUp /> : <ChevronDown />}
                {showAllIdeas ? "Show less" : "Show more"}
              </Button>
            )}
            {showAllIdeas && (
              <Button variant="outline" onClick={generateMore} className="mt-2 h-auto rounded-lg px-3 py-1.5 text-sm font-medium">
                <Sparkles />
                Generate more ideas
              </Button>
            )}
            {ideasNote && <p className="mt-2 text-sm text-muted-foreground">{ideasNote}</p>}
          </div>
        )}
        <div className="mt-4 rounded-xl bg-muted p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Your categories (items sort themselves)</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-sm">{c}
                <button type="button" aria-label={`Delete category ${c}`} className="text-muted-foreground hover:text-destructive" onClick={() => confirm(`Delete the "${c}" category? Its items will move to Other or another matching category.`, "Delete", () => update({ categories: categories.filter((x) => x !== c), items: list.items.map((x) => x.category === c ? { ...x, category: undefined } : x) }))}>✕</button>
              </span>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); addCategory(); }} className="mt-2 flex gap-2">
            <input aria-label="New category" className={`${field} mt-0 min-w-0`} placeholder="New category, e.g. Health" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
            <Button type="submit" variant="outline" className="h-auto">Add</Button>
          </form>
        </div>
        <div className="lg:columns-2 lg:gap-10">
        {groupItems(list.items, categories).map((g) => (
        <section key={g.name} className="mt-5 break-inside-avoid">
        <h3 className="font-display text-lg font-semibold">{g.name} <span className="text-sm font-normal text-muted-foreground">{g.items.filter((i) => i.packed).length}/{g.items.length}</span></h3>
        <ul className="divide-y divide-border">
          {g.items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 py-2 max-md:py-3">
              <button type="button" role="checkbox" aria-checked={i.packed} aria-label={`Pack ${i.name}`} onClick={() => { if (!i.packed) setPopped(i.id); update({ items: list.items.map((x) => (x.id === i.id ? { ...x, packed: !x.packed } : x)) }); }} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left">
                <span onAnimationEnd={() => setPopped(null)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${i.packed ? "border-primary bg-primary text-primary-foreground" : "border-input"} ${popped === i.id ? "animate-tick-pop" : ""}`}>{i.packed && <Check className="h-5 w-5" />}</span>
                <span className={`min-w-0 flex-1 break-words transition-all duration-300 ${i.packed ? "text-muted-foreground line-through opacity-70" : ""}`}>{i.name}</span>
              </button>
              <input type="number" aria-label={`Quantity of ${i.name}`} min={1} className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm" value={i.qty} onChange={(e) => update({ items: list.items.map((x) => (x.id === i.id ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x)) })} />
              <Button variant="ghost" size="icon" onClick={() => confirm(`Remove ${i.name} from the list?`, "Remove", () => update({ items: list.items.filter((x) => x.id !== i.id) }))} className="text-muted-foreground hover:text-destructive" aria-label={`Remove ${i.name}`}>✕</Button>
              <select aria-label={`Category for ${i.name}`} className="rounded-md border border-input bg-background px-1 py-1 text-xs text-muted-foreground max-md:min-h-10 max-md:text-sm" value={g.name} onChange={(e) => {
                const category = e.target.value;
                const move = () => update({ items: list.items.map((x) => x.id === i.id ? { ...x, category } : x) });
                if (category === OTHER && g.name !== OTHER) confirm(`Put ${i.name} in Other?`, "Put in Other", move);
                else move();
              }}>
                {[...categories, OTHER].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </li>
          ))}
        </ul>
        </section>
        ))}
        </div>
        {!list.items.length && <p className="py-6 text-center text-sm text-muted-foreground">Nothing on the list yet.</p>}
        <AlertDialog open={!!ask} onOpenChange={(o) => !o && setAsk(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>{ask?.title}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { ask?.run(); setAsk(null); }}>{ask?.action}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={pendingAdd !== null} onOpenChange={(open) => { if (!open) setPendingAdd(null); }}>
          <AlertDialogContent className="max-h-[85dvh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Put in Other?</AlertDialogTitle>
              <AlertDialogDescription>These items don’t match your categories. Keep them in Other or choose a category.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              {pendingAdd?.items.filter((item) => item.id in pendingAdd.choices).map((item) => (
                <label key={item.id} className="block space-y-1 text-sm">
                  <span className="break-words font-medium">{item.name}</span>
                  <select aria-label={`Choose category for ${item.name}`} className={field} value={pendingAdd.choices[item.id]} onChange={(event) => {
                    const category = event.target.value;
                    setPendingAdd((current) => current ? { ...current, choices: { ...current.choices, [item.id]: category } } : null);
                  }}>
                    {[...categories, OTHER].map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (!pendingAdd) return;
                update({ items: pendingAdd.items.map((item) => item.id in pendingAdd.choices ? { ...item, category: pendingAdd.choices[item.id] } : item) });
                setQuery("");
                setPendingAdd(null);
              }}>Confirm and add</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
