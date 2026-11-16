import { useEffect, useState } from 'react';

import { Brand, type Palette } from '@/constants/theme';

import type { Language, StringKey } from './i18n';
import type { TripStage } from './trips';

type T = (key: StringKey, vars?: Record<string, string | number>) => string;

/** A truck location older than this no longer counts as live (matches the admin freshness check). */
export const STALE_LOCATION_MS = 90_000;

/** Current time, re-rendering every `intervalMs` so "x seconds ago" labels stay honest. */
export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function formatAgo(t: T, then: Date, now: number) {
  const seconds = Math.max(0, Math.round((now - then.getTime()) / 1000));
  if (seconds < 10) return t('justNow');
  if (seconds < 60) return t('secondsAgo', { n: seconds });
  return t('minutesAgo', { n: Math.round(seconds / 60) });
}

export function formatWhen(language: Language, date: Date) {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  };
  try {
    return date.toLocaleString(language === 'ml' ? 'ml-IN' : 'en-IN', options);
  } catch {
    return date.toLocaleString('en-IN', options);
  }
}

export function formatRupees(amount: number) {
  return amount.toLocaleString('en-IN');
}

/**
 * Pill colours per stage, from the active palette (so they hold in dark mode).
 * Orange and white only: live stages are orange, finished ones quiet, and
 * red is kept for the two failures (cancelled, no truck found).
 */
export function stageColors(stage: TripStage, palette: Palette = Brand) {
  switch (stage) {
    case 'payment_due':
      return { bg: palette.primary, fg: palette.onPrimary };
    case 'completed':
      return { bg: palette.surface, fg: palette.text };
    case 'cancelled':
    case 'no_driver':
      return { bg: palette.dangerFill, fg: palette.danger };
    default:
      return { bg: palette.selected, fg: palette.link };
  }
}

/** Date and time on their own, for layouts that give each its own place and never truncate. */
export function formatDay(language: Language, date: Date) {
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
  try {
    return date.toLocaleDateString(language === 'ml' ? 'ml-IN' : 'en-IN', options);
  } catch {
    return date.toLocaleDateString('en-IN', options);
  }
}

export function formatTime(language: Language, date: Date) {
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  try {
    return date.toLocaleTimeString(language === 'ml' ? 'ml-IN' : 'en-IN', options);
  } catch {
    return date.toLocaleTimeString('en-IN', options);
  }
}

/**
 * A readable place name from an address. Usually the first part, but never a
 * bare door number or a fragment: "11, MG Road, Thrissur" gives "11, MG Road".
 */
export function placeName(label: string) {
  const parts = label.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return label.trim();
  return /^\d/.test(parts[0]) || parts[0].length < 5 ? `${parts[0]}, ${parts[1]}` : parts[0];
}
