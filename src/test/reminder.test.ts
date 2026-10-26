import { describe, expect, it } from "vitest";
import type { PackList } from "@/lib/packing";
import { calendarFile, leaveDate, reminderKey, reminderMessage, reminderState, unpackedItems } from "@/lib/reminder";

const trip = (patch: Partial<PackList> = {}): PackList => ({
  id: "t1", name: "Spain", destination: "Barcelona", startDate: "2026-07-05", nights: 5, leaveTime: "08:00",
  items: [
    { id: "a", name: "Passport", qty: 1, packed: false },
    { id: "b", name: "Socks", qty: 4, packed: false },
    { id: "c", name: "Sun cream", qty: 1, packed: true },
  ],
  ...patch,
});
const at = (h: number, m: number) => new Date(2026, 6, 5, h, m);

describe("leaving reminders", () => {
  it("needs both a date and a time", () => {
    expect(leaveDate(trip())).toEqual(at(8, 0));
    expect(leaveDate(trip({ leaveTime: undefined }))).toBeNull();
    expect(leaveDate(trip({ startDate: "" }))).toBeNull();
    expect(reminderState(trip({ leaveTime: undefined }), at(7, 50)).kind).toBe("none");
  });
  it("is quiet until 15 minutes before, then due, then missed, then over", () => {
    expect(reminderState(trip(), at(7, 40)).kind).toBe("later");
    expect(reminderState(trip(), at(7, 45)).kind).toBe("due");
    const due = reminderState(trip(), at(7, 50));
    expect(due.kind === "due" && due.minsLeft).toBe(10);
    expect(reminderState(trip(), at(8, 10)).kind).toBe("missed");
    expect(reminderState(trip(), at(9, 30)).kind).toBe("none");
  });
  it("uses the chosen lead time, and ignores odd values", () => {
    expect(reminderState(trip({ remindMins: 30 }), at(7, 31)).kind).toBe("due");
    expect(reminderState(trip({ remindMins: 10 }), at(7, 49)).kind).toBe("later");
    expect(reminderState(trip({ remindMins: 999 }), at(7, 46)).kind).toBe("due");
  });
  it("lists what is still to pack", () => {
    expect(unpackedItems(trip())).toEqual(["Passport", "4x Socks"]);
    const message = reminderMessage(trip(), reminderState(trip(), at(7, 50)));
    expect(message?.title).toBe("Leaving for Barcelona in 10 min. Forgotten anything?");
    expect(message?.body).toBe("Still to pack (2): Passport, 4x Socks");
  });
  it("says so when everything is ticked and shortens long lists", () => {
    const done = trip({ items: [{ id: "a", name: "Passport", qty: 1, packed: true }] });
    expect(reminderMessage(done, reminderState(done, at(7, 50)))?.body).toContain("ticked off");
    const many = trip({ items: Array.from({ length: 8 }, (_, i) => ({ id: String(i), name: `Item ${i}`, qty: 1, packed: false })) });
    expect(reminderMessage(many, reminderState(many, at(7, 50)))?.body).toBe("Still to pack (8): Item 0, Item 1, Item 2, Item 3, Item 4 and 3 more");
    expect(reminderMessage(trip(), reminderState(trip(), at(7, 0)))).toBeNull();
  });
  it("re-arms when the time changes", () => {
    expect(reminderKey(trip())).not.toBe(reminderKey(trip({ leaveTime: "09:00" })));
    expect(reminderKey(trip())).toBe(reminderKey(trip()));
  });
  it("builds a calendar file with an alarm", () => {
    const ics = calendarFile(trip({ remindMins: 10 }), new Date(Date.UTC(2026, 6, 1, 12, 0, 0))) ?? "";
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20260705T080000");
    expect(ics).toContain("DTEND:20260705T083000");
    expect(ics).toContain("TRIGGER:-PT10M");
    expect(ics).toContain("SUMMARY:Leave for Barcelona");
    expect(ics.replace(/\r\n /g, "")).toContain("Passport\\, 4x Socks");
    expect(ics.split("\r\n").every((line) => line.length <= 75)).toBe(true);
    expect(calendarFile(trip({ leaveTime: undefined }))).toBeNull();
  });
});
