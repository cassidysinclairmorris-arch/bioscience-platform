// Scheduling times: a post is scheduled as a wall-clock time in a named zone
// ("14 Sep 2026, 10:30 AM, Pacific"), which is how a person thinks about it.
//
// Storage keeps both halves rather than one ambiguous string:
//   posts.scheduled_at      wall clock, "2026-09-14T10:30"  (what was chosen)
//   posts.timezone          IANA zone, "America/Los_Angeles"
//   posts.scheduled_at_utc  the real instant, "2026-09-14T17:30:00.000Z"
//
// The wall clock is what gets displayed, so a post always reads back exactly as
// it was entered no matter who is looking. The UTC instant is what the publisher
// compares against, so 10:30 Pacific never fires at 10:30 Eastern.
//
// Rows written before timezones existed have no `timezone` and no
// `scheduled_at_utc`. They keep displaying their stored wall clock as-is and the
// publisher falls back to the old comparison, so nothing shifts under them.

export type TimezoneOption = { value: string; label: string; abbr: string };

// The zones a US-facing agency actually schedules into, plus the common
// international ones. `abbr` is a display hint; the real abbreviation is
// derived per date so it follows daylight saving.
export const TIMEZONES: TimezoneOption[] = [
  { value: "America/Los_Angeles", label: "Pacific Time",   abbr: "PT" },
  { value: "America/Denver",      label: "Mountain Time",  abbr: "MT" },
  { value: "America/Chicago",     label: "Central Time",   abbr: "CT" },
  { value: "America/New_York",    label: "Eastern Time",   abbr: "ET" },
  { value: "UTC",                 label: "UTC",            abbr: "UTC" },
  { value: "Europe/London",       label: "London",         abbr: "GMT/BST" },
  { value: "Europe/Zurich",       label: "Central Europe", abbr: "CET/CEST" },
  { value: "Asia/Singapore",      label: "Singapore",      abbr: "SGT" },
  { value: "Australia/Sydney",    label: "Sydney",         abbr: "AET" },
];

// Legacy clients store a loose zone label rather than an IANA name. Map the
// ones already in the database so existing rows keep working.
const LEGACY_ZONES: Record<string, string> = {
  EST: "America/New_York", EDT: "America/New_York", ET: "America/New_York",
  CST: "America/Chicago",  CDT: "America/Chicago",  CT: "America/Chicago",
  MST: "America/Denver",   MDT: "America/Denver",   MT: "America/Denver",
  PST: "America/Los_Angeles", PDT: "America/Los_Angeles", PT: "America/Los_Angeles",
  GMT: "Europe/London", UTC: "UTC", CET: "Europe/Zurich",
};

export function toIanaZone(tz: string | null | undefined): string | null {
  if (!tz) return null;
  if (tz.includes("/")) return tz;
  return LEGACY_ZONES[tz.toUpperCase()] ?? null;
}

// How far ahead of UTC `tz` is at a given instant, in milliseconds.
function offsetMs(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  // Intl renders midnight as hour 24; Date.UTC handles the rollover.
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUtc - instant.getTime();
}

// Parse "2026-09-14T10:30" or "2026-09-14 10:30:00" into its parts.
function parseWall(wall: string): { y: number; mo: number; d: number; h: number; mi: number } | null {
  const m = String(wall).trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5] };
}

// The real instant a wall-clock time in `tz` refers to. Two passes so a time
// that lands near a daylight saving change resolves to the correct offset.
export function wallClockToUtc(wall: string, tz: string): Date | null {
  const p = parseWall(wall);
  if (!p) return null;
  const naive = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, 0);
  let guess = new Date(naive - offsetMs(new Date(naive), tz));
  const refined = offsetMs(guess, tz);
  const second = new Date(naive - refined);
  if (second.getTime() !== guess.getTime()) guess = second;
  return guess;
}

// The zone abbreviation in force on that date, e.g. PDT in summer, PST in winter.
export function zoneAbbr(wall: string, tz: string): string {
  const instant = wallClockToUtc(wall, tz);
  if (!instant) return "";
  const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
    .formatToParts(instant).find(p => p.type === "timeZoneName");
  return part?.value ?? "";
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "September 14, 2026 at 10:30 AM PDT". Formats the stored wall clock directly,
// never converting to the reader's own zone, so agency and client see the same
// thing. A row with no timezone simply omits the suffix.
export function formatScheduled(wall: string | null | undefined, tz?: string | null): string {
  if (!wall) return "";
  const p = parseWall(wall);
  if (!p) return String(wall);
  const h12 = p.h % 12 === 0 ? 12 : p.h % 12;
  const ampm = p.h < 12 ? "AM" : "PM";
  const base = `${MONTHS[p.mo - 1]} ${p.d}, ${p.y} at ${h12}:${String(p.mi).padStart(2, "0")} ${ampm}`;
  const zone = toIanaZone(tz);
  return zone ? `${base} ${zoneAbbr(wall, zone)}` : base;
}

// Compact form for calendar cells and list rows: "10:30 AM PDT".
export function formatScheduledTime(wall: string | null | undefined, tz?: string | null): string {
  if (!wall) return "";
  const p = parseWall(wall);
  if (!p) return "";
  const h12 = p.h % 12 === 0 ? 12 : p.h % 12;
  const ampm = p.h < 12 ? "AM" : "PM";
  const zone = toIanaZone(tz);
  return `${h12}:${String(p.mi).padStart(2, "0")} ${ampm}${zone ? ` ${zoneAbbr(wall, zone)}` : ""}`;
}

// Split a stored wall clock into the pieces the scheduling form edits.
export function splitWall(wall: string | null | undefined): { date: string; hour: number; minute: number; ampm: "AM" | "PM" } {
  const p = wall ? parseWall(wall) : null;
  if (!p) return { date: "", hour: 9, minute: 0, ampm: "AM" };
  return {
    date: `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`,
    hour: p.h % 12 === 0 ? 12 : p.h % 12,
    minute: p.mi,
    ampm: p.h < 12 ? "AM" : "PM",
  };
}

// Rebuild the stored wall-clock string from the form pieces.
export function joinWall(date: string, hour: number, minute: number, ampm: "AM" | "PM"): string {
  const h24 = ampm === "AM" ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12);
  return `${date}T${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
