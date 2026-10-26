import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type Climate,
  type PackList,
  type Place,
  type Stop,
  type WeatherSummary,
  climateFor,
  fetchWeather,
  findPlace,
  placeLabel,
  stopStartDates,
  stopsLabel,
  totalNights,
  uid,
  weatherLabel,
} from "@/lib/packing";

const climateLabel: Record<Climate, string> = {
  hot: "☀️ Hot weather",
  warm: "🌤️ Warm weather",
  mild: "⛅ Mild weather",
  cold: "❄️ Cold weather",
};

export function WeatherCard({ weather, climate }: { weather: WeatherSummary; climate?: Climate | undefined }) {
  return (
    <div className="mt-4 rounded-xl bg-accent p-4 text-accent-foreground">
      <div className="font-display text-lg font-semibold">{climate && climateLabel[climate]} in {weather.place}</div>
      <div className="text-sm">
        Highs around {weather.avgHigh}°C, lows around {weather.avgLow}°C · {weather.rainyDays} rainy day{weather.rainyDays === 1 ? "" : "s"}
      </div>
      {weather.days && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {weather.days.map((day) => (
            <div key={day.date} className="border-t border-border py-3 text-sm">
              <p className="font-semibold">{new Date(`${day.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</p>
              <p>{weatherLabel(day.code)}</p>
              <p>{Math.round(day.high)}° / {Math.round(day.low)}°C</p>
              <p className="text-xs">{day.rain} mm rain</p>
            </div>
          ))}
        </div>
      )}
      {weather.source === "last-year" && (
        <div className="mt-1 text-xs opacity-75">Your trip is too far ahead for a forecast, so this is based on the same dates last year.</div>
      )}
    </div>
  );
}

const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** Lets one holiday visit several places, with the nights spent at each and the weather for each. */
export function StopsEditor({
  list,
  update,
  field,
  confirm,
}: {
  list: PackList;
  update: (patch: Partial<PackList>) => void;
  field: string;
  confirm: (title: string, action: string, run: () => void) => void;
}) {
  const stops = list.stops ?? [];
  const latest = useRef(stops);
  latest.current = stops;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [choices, setChoices] = useState<{ stopId: string; places: Place[] } | null>(null);

  // dates[i] is the day stop i starts; the extra last entry is the day the whole trip ends.
  const dates = stopStartDates(list.startDate, [...stops, { id: "end", place: "", nights: 0 }]);
  const days = totalNights(stops) + 1;

  const save = (next: Stop[]) => update({ stops: next, nights: totalNights(next), destination: stopsLabel(next), weather: undefined });
  const setError = (id: string, message: string) => setErrors((e) => ({ ...e, [id]: message }));

  const changePlace = (id: string, place: string) => {
    setError(id, "");
    save(stops.map((s) => (s.id === id ? { ...s, place, weather: undefined } : s)));
  };
  // Changing nights moves the dates of every later stop, so their weather has to be checked again.
  const changeNights = (id: string, value: string) => {
    const index = stops.findIndex((s) => s.id === id);
    const nights = value === "" ? 0 : Math.max(0, Math.min(365, Math.floor(Number(value)) || 0));
    save(stops.map((s, i) => (i === index ? { ...s, nights, weather: undefined } : i > index ? { ...s, weather: undefined } : s)));
  };
  const addStop = () => save([...stops, { id: uid(), place: "", nights: 2 }]);
  const removeStop = (id: string) => {
    const index = stops.findIndex((s) => s.id === id);
    save(stops.filter((s) => s.id !== id).map((s, i) => (i >= index ? { ...s, weather: undefined } : s)));
  };
  const move = (id: string, direction: -1 | 1) => {
    const from = stops.findIndex((s) => s.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= stops.length) return;
    const next = [...stops];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    const first = Math.min(from, to);
    save(next.map((s, i) => (i >= first ? { ...s, weather: undefined } : s)));
  };
  const backToOnePlace = () => {
    const only = stops.length === 1 ? stops[0] : undefined;
    update({ stops: undefined, destination: stops[0]?.place ?? "", nights: totalNights(stops), weather: only?.weather });
  };

  const loadWeather = async (stopId: string, place: Place) => {
    const index = latest.current.findIndex((s) => s.id === stopId);
    const stop = latest.current[index];
    const start = stopStartDates(list.startDate, latest.current)[index];
    if (!stop || !start) return;
    setBusyId(stopId);
    setError(stopId, "");
    setChoices(null);
    try {
      const weather = await fetchWeather(place, start, stop.nights);
      update({ stops: latest.current.map((s) => (s.id === stopId ? { ...s, weather } : s)) });
    } catch (e) {
      setError(stopId, e instanceof Error ? e.message : "Couldn't get the weather");
    }
    setBusyId(null);
  };

  const check = async (stop: Stop) => {
    if (!stop.place.trim()) return setError(stop.id, "Add where you're going first");
    if (stop.nights < 1) return setError(stop.id, "Add how many nights you're staying here");
    setBusyId(stop.id);
    setError(stop.id, "");
    setChoices(null);
    const { match, options } = await findPlace(stop.place);
    if (match) return loadWeather(stop.id, match);
    setBusyId(null);
    if (options.length) setChoices({ stopId: stop.id, places: options });
    else setError(stop.id, "We couldn't find anywhere with that name. Try checking the spelling or adding the country.");
  };

  const checkAll = async () => {
    for (const stop of latest.current) {
      if (stop.weather || !stop.place.trim() || stop.nights < 1) continue;
      setBusyId(stop.id);
      const { match } = await findPlace(stop.place);
      if (match) await loadWeather(stop.id, match);
      else setError(stop.id, `We couldn't pin down "${stop.place}" — use its own Check button to choose the right one.`);
    }
    setBusyId(null);
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Where are you staying?</h2>
        <span className="text-sm text-muted-foreground">
          {totalNights(stops)} night{totalNights(stops) === 1 ? "" : "s"} in total · {days} days
        </span>
      </div>
      <label className="mt-2 block text-sm">Leaving on
        <input
          type="date"
          className={`${field} sm:max-w-xs`}
          value={list.startDate}
          onChange={(e) => update({ startDate: e.target.value, weather: undefined, stops: stops.map((s) => ({ ...s, weather: undefined })) })}
        />
      </label>

      <ol className="mt-4 space-y-3">
        {stops.map((stop, index) => {
          const start = dates[index];
          const end = dates[index + 1];
          return (
            <li key={stop.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{index + 1}</span>
                {start && end && <span className="text-xs text-muted-foreground">{shortDate(start)} → {shortDate(end)}</span>}
                <span className="ml-auto flex gap-1">
                  <Button variant="ghost" size="icon" aria-label={`Move stop ${index + 1} up`} disabled={index === 0} onClick={() => move(stop.id, -1)}><ArrowUp /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Move stop ${index + 1} down`} disabled={index === stops.length - 1} onClick={() => move(stop.id, 1)}><ArrowDown /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Remove stop ${index + 1}`} onClick={() => removeStop(stop.id)}><Trash2 /></Button>
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_9rem]">
                <label className="text-sm">Where to?
                  <input className={field} placeholder="e.g. Florence" value={stop.place} onChange={(e) => changePlace(stop.id, e.target.value)} />
                </label>
                <label className="text-sm">Nights here ({Math.max(0, stop.nights)} {stop.nights === 1 ? "day" : "days"})
                  <input type="number" min={0} className={field} value={stop.nights === 0 ? "" : stop.nights} placeholder="e.g. 3" onChange={(e) => changeNights(stop.id, e.target.value)} />
                </label>
              </div>
              <Button variant="secondary" disabled={busyId !== null} onClick={() => check(stop)} className="mt-3 rounded-lg px-4 py-2 font-medium">
                {busyId === stop.id ? "Checking…" : stop.weather ? "Check again" : "Check the weather"}
              </Button>
              {errors[stop.id] && <p className="mt-2 text-sm text-destructive">{errors[stop.id]}</p>}
              {choices?.stopId === stop.id && (
                <div className="mt-3 rounded-xl border border-border bg-muted p-3">
                  <div className="font-medium">Did you mean…</div>
                  <div className="mt-2 flex flex-col gap-1">
                    {choices.places.map((o) => (
                      <Button
                        variant="ghost"
                        key={`${o.latitude},${o.longitude}`}
                        onClick={() => { changePlace(stop.id, o.name); void loadWeather(stop.id, o); }}
                        className="h-auto justify-start whitespace-normal rounded-lg px-3 py-2 text-left hover:bg-card"
                      >
                        📍 {placeLabel(o)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {stop.weather && <WeatherCard weather={stop.weather} climate={climateFor(stop.weather)} />}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={addStop}><Plus />Add another place</Button>
        <Button variant="secondary" disabled={busyId !== null || stops.every((s) => s.weather || !s.place.trim() || s.nights < 1)} onClick={() => void checkAll()}>
          {busyId !== null ? "Checking…" : "Check the weather for every place"}
        </Button>
        <Button variant="ghost" onClick={() => (stops.length > 1 ? confirm("Go back to a single place? Your places will be combined into one trip, and the weather will need checking again.", "Go back", backToOnePlace) : backToOnePlace())}>
          Back to one place
        </Button>
      </div>
    </div>
  );
}
