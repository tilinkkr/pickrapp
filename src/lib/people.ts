import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import type { StringKey } from './i18n';
import { formatIndianMobile } from './otp';
import { formatRupees } from './trip-format';
import type { Trip } from './trips';

/**
 * The person who meets the truck when a booking is for someone else: a site
 * supervisor, the house owner, a relative (Uber's "switch rider", Porter's
 * sender/receiver details). Pickr still takes no payment; `pays` only tells
 * the driver who will hand over the cash or UPI at the end.
 */
export type OtherPerson = {
  name: string;
  /** 10-digit Indian mobile number, without +91. */
  phone: string;
  /** Where they meet the truck. */
  meets: 'drop' | 'pickup' | 'both';
  /** Who pays the driver after delivery. */
  pays: 'me' | 'them';
};

const KEY = 'pickr.people';
const MAX = 5;

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/** People this customer booked for before, newest first; kept on this phone only. */
export function useRecentPeople() {
  const [people, setPeople] = useState<OtherPerson[]>([]);
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!cancelled && raw) setPeople(JSON.parse(raw) as OtherPerson[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return people;
}

/** Puts the person first in the recent list (one entry per number). */
export async function rememberPerson(person: OtherPerson) {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as OtherPerson[]) : [];
    const next = [person, ...list.filter((p) => p.phone !== person.phone)].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Recents are a convenience; a failed save changes nothing about the booking.
  }
}

type T = (key: StringKey, vars?: Record<string, string | number>) => string;

/** "Receives the load at the drop", in words. */
export function meetsText(t: T, meets: OtherPerson['meets']) {
  return t(meets === 'drop' ? 'receivesAtDrop' : meets === 'pickup' ? 'handsOverAtPickup' : 'meetsBoth');
}

/** "Anu · +91 98470 12345". */
export const personLine = (person: OtherPerson) => `${person.name} · ${formatIndianMobile(person.phone)}`;

/**
 * The text the customer sends to the other person from their own phone
 * (system share sheet; Pickr sends no messages). The start PIN is included
 * only when they meet the truck at pickup, where it is needed.
 */
export function shareTripText(t: T, trip: Trip) {
  const person = trip.forOther;
  const lines = [
    t('shareIntro', { code: trip.code }),
    t('shareLoad', { load: `${trip.material} · ${trip.quantity}` }),
    t('shareFrom', { place: trip.pickup }),
    t('shareTo', { place: trip.delivery }),
  ];
  if (trip.driver) lines.push(t('shareDriver', { name: trip.registration ? `${trip.driver.name} · ${trip.registration}` : trip.driver.name }));
  if (trip.pin && person && person.meets !== 'drop') lines.push(t('sharePin', { pin: trip.pin }));
  if (person?.pays === 'them') lines.push(t('sharePay', { amount: formatRupees(trip.amount ?? trip.quote ?? 0) }));
  return lines.join('\n');
}
