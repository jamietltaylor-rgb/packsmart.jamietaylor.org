import { useEffect, useRef, useState } from "react";
import { Bell, CalendarPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PackList } from "@/lib/packing";
import {
  REMIND_CHOICES,
  calendarFile,
  formatLeaving,
  reminderKey,
  reminderMessage,
  reminderState,
  remindMinutes,
} from "@/lib/reminder";
import { downloadCalendar, enableNotifications, notifyState, showReminder, type NotifyState } from "@/lib/reminder-notify";

const FIRED_KEY = "pack-smart-reminded";
const DISMISSED_KEY = "pack-smart-reminder-dismissed";

function readKeys(key: string): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(-50) : [];
  } catch {
    return [];
  }
}
function addKey(key: string, value: string) {
  try {
    localStorage.setItem(key, JSON.stringify([...readKeys(key).filter((x) => x !== value), value].slice(-50)));
  } catch {
    /* private mode: the reminder just may show again */
  }
}

/** Per-trip settings: what time you leave, how early to be reminded, and how to get the reminder. */
export function LeaveReminderPanel({ list, update, field }: { list: PackList; update: (patch: Partial<PackList>) => void; field: string }) {
  const [permission, setPermission] = useState<NotifyState>("default");
  useEffect(() => setPermission(notifyState()), []);
  const state = reminderState(list, new Date());
  const calendar = calendarFile(list);

  const status = !list.leaveTime
    ? "Add a time and Pack Smart will remind you before you leave."
    : !list.startDate
      ? "Set the \"Leaving on\" date above to get a reminder."
      : state.kind === "later"
        ? `You'll be reminded at ${state.remindAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}, ${remindMinutes(list)} minutes before you leave (${formatLeaving(state.leaveAt)}).`
        : state.kind === "due" || state.kind === "missed"
          ? "It's nearly time to leave. See the reminder at the top of the page."
          : "That leaving time has passed.";

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="font-display text-lg font-semibold">Leaving time</div>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Leaving at
          <input type="time" className={field} value={list.leaveTime ?? ""} onChange={(e) => update({ leaveTime: e.target.value || undefined })} />
        </label>
        <label className="text-sm">Remind me
          <select className={field} value={remindMinutes(list)} onChange={(e) => update({ remindMins: Number(e.target.value) })}>
            {REMIND_CHOICES.map((m) => <option key={m} value={m}>{m} minutes before</option>)}
          </select>
        </label>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{status}</p>
      {list.leaveTime && (
        <div className="mt-3 flex flex-wrap gap-2">
          {permission === "default" && (
            <Button type="button" variant="outline" onClick={async () => setPermission(await enableNotifications())}><Bell />Turn on notifications</Button>
          )}
          {permission === "granted" && <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Bell className="size-4" />Notifications are on</span>}
          <Button type="button" variant="outline" disabled={!calendar} onClick={() => calendar && downloadCalendar(calendar, list.destination || list.name)}><CalendarPlus />Add to calendar with a reminder</Button>
        </div>
      )}
      {list.leaveTime && permission === "denied" && <p className="mt-2 text-sm text-muted-foreground">Notifications are blocked for this site. Allow them in your browser settings, or use the calendar button.</p>}
      {list.leaveTime && permission === "unsupported" && <p className="mt-2 text-sm text-muted-foreground">This browser can't show notifications. On an iPhone, add Pack Smart to your home screen first, then open it from there. Or use the calendar button.</p>}
      <p className="mt-2 text-xs text-muted-foreground">Notifications appear while Pack Smart is open or running in the background on your phone. To be reminded even when it's closed, use the calendar button. The calendar reminder lists what was left to pack when you added it, so it can't update later.</p>
    </div>
  );
}

/** Shows a "forgotten anything?" card (and a notification) when it is time to leave for any trip. */
export function ReminderBanner({ lists, onOpen }: { lists: PackList[]; onOpen: (id: string) => void }) {
  const [now, setNow] = useState(() => new Date());
  const [dismissed, setDismissed] = useState<string[]>([]);
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(readKeys(DISMISSED_KEY));
    fired.current = new Set(readKeys(FIRED_KEY));
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, 20000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const due = lists
    .map((list) => ({ list, key: reminderKey(list), state: reminderState(list, now) }))
    .filter(({ key, state }) => (state.kind === "due" || state.kind === "missed") && !dismissed.includes(key));

  const dueKeys = due.map((d) => d.key).join("\n");
  useEffect(() => {
    for (const { list, key, state } of due) {
      if (fired.current.has(key)) continue;
      fired.current.add(key);
      addKey(FIRED_KEY, key);
      const message = reminderMessage(list, state);
      if (message) void showReminder(message.title, message.body, key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueKeys]);

  if (!due.length) return null;
  return (
    <div className="mx-auto max-w-5xl space-y-3 px-4 pt-4 md:px-6 lg:max-w-6xl">
      {due.map(({ list, key, state }) => {
        const message = reminderMessage(list, state);
        if (!message) return null;
        return (
          <div key={key} role="alert" className="border-2 border-primary bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="font-display text-xl font-semibold">{message.title}</div>
              <Button type="button" variant="ghost" size="icon" aria-label="Dismiss reminder" onClick={() => { addKey(DISMISSED_KEY, key); setDismissed((d) => [...d, key]); }}><X /></Button>
            </div>
            <p className="mt-1 break-words text-sm">{message.body}</p>
            <Button type="button" className="mt-3" onClick={() => onOpen(list.id)}>Open the list</Button>
          </div>
        );
      })}
    </div>
  );
}
