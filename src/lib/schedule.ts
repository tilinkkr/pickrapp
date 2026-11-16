/**
 * School-hour safety windows (agreed 2026-11-03): no truck starts 8:00–10:00 AM
 * or 2:30–4:00 PM. Times are minutes after midnight, India Standard Time
 * (the pilot's phones run on IST).
 */
export const RESTRICTED_WINDOWS = [
  { start: 8 * 60, end: 10 * 60 },
  { start: 14 * 60 + 30, end: 16 * 60 },
] as const;

export const DATE_CHOICES = 7;

/** Smart default when switching to Schedule: tomorrow 11:00 AM, outside both windows. */
export const DEFAULT_SCHEDULE: ScheduleInput = { dayOffset: 1, hour: '11', minute: '00', meridiem: 'AM' };

export type ScheduleInput = {
  /** 0 = today … 6 = six days from now. */
  dayOffset: number;
  hour: string;
  minute: string;
  meridiem: 'AM' | 'PM';
};

export type ScheduleCheck =
  | { ok: true; date: Date }
  | { ok: false; reason: 'invalid' | 'past' | 'restricted' };

export function restrictedWindowAt(minutes: number) {
  return RESTRICTED_WINDOWS.find((w) => minutes >= w.start && minutes < w.end);
}

/** If now is inside a window, when it ends (e.g. "10:00 AM"); otherwise null. */
export function asapBlockedUntil(now: Date) {
  const window = restrictedWindowAt(now.getHours() * 60 + now.getMinutes());
  if (!window) return null;
  return formatMinutes(window.end);
}

export function formatMinutes(minutes: number) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

export function dayFromNow(offset: number, now = new Date()) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

export function checkSchedule(input: ScheduleInput, now = new Date()): ScheduleCheck {
  const hour = Number(input.hour);
  const minute = Number(input.minute);
  if (!/^\d{1,2}$/.test(input.hour) || !/^\d{1,2}$/.test(input.minute)) return { ok: false, reason: 'invalid' };
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return { ok: false, reason: 'invalid' };

  const h24 = (hour % 12) + (input.meridiem === 'PM' ? 12 : 0);
  const minutesOfDay = h24 * 60 + minute;
  const date = dayFromNow(input.dayOffset, now);
  date.setHours(h24, minute, 0, 0);

  if (date.getTime() <= now.getTime()) return { ok: false, reason: 'past' };
  if (restrictedWindowAt(minutesOfDay)) return { ok: false, reason: 'restricted' };
  return { ok: true, date };
}
