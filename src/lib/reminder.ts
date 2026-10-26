// "I'm leaving at ..." reminders. Pure code (no browser APIs) so it is easy to test.
// The leaving date is the trip's start date; the person adds a time and how many minutes before it
// they want a nudge listing what is still to be ticked off.

import type { PackList } from "./packing";

export const REMIND_CHOICES = [10, 15, 30] as const;
export const DEFAULT_REMIND_MINS = 15;
const MISSED_WINDOW_MINS = 60;

export function leaveDate(list: Pick<PackList, "startDate" | "leaveTime">): Date | null {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(list.startDate ?? "");
  const time = /^(\d{2}):(\d{2})$/.exec(list.leaveTime ?? "");
  if (!date || !time) return null;
  const when = new Date(Number(date[1]), Number(date[2]) - 1, Number(date[3]), Number(time[1]), Number(time[2]));
  return Number.isNaN(when.getTime()) ? null : when;
}

export const remindMinutes = (list: Pick<PackList, "remindMins">): number =>
  REMIND_CHOICES.includes((list.remindMins ?? DEFAULT_REMIND_MINS) as 10 | 15 | 30) ? (list.remindMins ?? DEFAULT_REMIND_MINS) : DEFAULT_REMIND_MINS;

export function unpackedItems(list: Pick<PackList, "items">): string[] {
  return list.items.filter((item) => !item.packed).map((item) => (item.qty > 1 ? `${item.qty}x ${item.name}` : item.name));
}

export type ReminderState =
  | { kind: "none" }
  | { kind: "later"; leaveAt: Date; remindAt: Date }
  | { kind: "due"; leaveAt: Date; minsLeft: number }
  | { kind: "missed"; leaveAt: Date; minsAgo: number };

export function reminderState(list: PackList, now: Date): ReminderState {
  const leaveAt = leaveDate(list);
  if (!leaveAt) return { kind: "none" };
  const remindAt = new Date(leaveAt.getTime() - remindMinutes(list) * 60000);
  if (now < remindAt) return { kind: "later", leaveAt, remindAt };
  if (now < leaveAt) return { kind: "due", leaveAt, minsLeft: Math.max(1, Math.ceil((leaveAt.getTime() - now.getTime()) / 60000)) };
  const minsAgo = Math.floor((now.getTime() - leaveAt.getTime()) / 60000);
  return minsAgo < MISSED_WINDOW_MINS ? { kind: "missed", leaveAt, minsAgo } : { kind: "none" };
}

// One key per trip, date, time and lead time, so a reminder fires once and changing the time re-arms it.
export const reminderKey = (list: PackList): string => `${list.id}|${list.startDate}|${list.leaveTime ?? ""}|${remindMinutes(list)}`;

export function reminderMessage(list: PackList, state: ReminderState): { title: string; body: string } | null {
  if (state.kind !== "due" && state.kind !== "missed") return null;
  const place = list.destination.trim() || list.name;
  const left = unpackedItems(list);
  const title = state.kind === "due"
    ? `Leaving for ${place} in ${state.minsLeft} min. Forgotten anything?`
    : `You were due to leave for ${place} ${state.minsAgo < 1 ? "just now" : `${state.minsAgo} min ago`}. Forgotten anything?`;
  if (!left.length) return { title, body: "Everything on your list is ticked off. Have a great trip!" };
  const shown = left.slice(0, 5).join(", ");
  const more = left.length > 5 ? ` and ${left.length - 5} more` : "";
  return { title, body: `Still to pack (${left.length}): ${shown}${more}` };
}

export function formatLeaving(leaveAt: Date): string {
  return `${leaveAt.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} at ${leaveAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

// ---------- calendar file (works even when the app is closed) ----------

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const stampUtc = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const escapeText = (text: string) => text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// Calendar lines must be 75 characters or fewer; longer ones continue on the next line after a space.
const fold = (line: string) => (line.match(/.{1,70}/g) ?? [""]).map((part, i) => (i ? ` ${part}` : part)).join("\r\n");

export function calendarFile(list: PackList, now = new Date()): string | null {
  const leaveAt = leaveDate(list);
  if (!leaveAt) return null;
  const mins = remindMinutes(list);
  const place = list.destination.trim() || list.name;
  const left = unpackedItems(list);
  const note = left.length
    ? `Still to pack when this was added (${left.length}): ${left.join(", ")}. Open Pack Smart for the latest list.`
    : "Everything on your list was ticked off when this was added. Open Pack Smart to double-check.";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pack Smart//Leaving reminder//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${list.id}-${stamp(leaveAt)}@packsmart`,
    `DTSTAMP:${stampUtc(now)}`,
    `DTSTART:${stamp(leaveAt)}`,
    `DTEND:${stamp(new Date(leaveAt.getTime() + 30 * 60000))}`,
    `SUMMARY:${escapeText(`Leave for ${place}`)}`,
    `DESCRIPTION:${escapeText(note)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `TRIGGER:-PT${mins}M`,
    `DESCRIPTION:${escapeText(`Leaving in ${mins} minutes. Have you packed everything?`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
