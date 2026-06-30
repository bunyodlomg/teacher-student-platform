/** Calendar linking helpers — add a deadline to Google Calendar or download .ics. */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** UTC timestamp in the basic format calendars expect: YYYYMMDDTHHMMSSZ */
function toCalDate(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export interface CalendarEvent {
  title: string;
  details?: string;
  /** ISO string or Date — the deadline moment */
  due: string | Date;
  /** event length in minutes (default 60) */
  durationMin?: number;
}

function range(e: CalendarEvent): { start: Date; end: Date } {
  const start = new Date(e.due);
  const end = new Date(start.getTime() + (e.durationMin ?? 60) * 60 * 1000);
  return { start, end };
}

/** A Google Calendar "create event" URL (opens in a new tab). */
export function googleCalendarUrl(e: CalendarEvent): string {
  const { start, end } = range(e);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${toCalDate(start)}/${toCalDate(end)}`,
    details: e.details ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** An .ics file as a data URL (works with Apple/Outlook and most clients). */
export function icsDataUrl(e: CalendarEvent): string {
  const { start, end } = range(e);
  const esc = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const uid = `${toCalDate(start)}-${Math.random().toString(36).slice(2, 8)}@cambridge-learn`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cambridge Learn//UZ//",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toCalDate(new Date())}`,
    `DTSTART:${toCalDate(start)}`,
    `DTEND:${toCalDate(end)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(e.details ?? "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}
