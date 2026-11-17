import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { LatLng } from './service-area';

/** A place as people say it: a name to read first, then the rest of the address. */
export type Place = { title: string; detail: string };

export type PlaceLookup = { ok: true; place: Place } | { ok: false; reason: 'permission' | 'empty' | 'failed' };

/** Android often names unnamed spots by their Plus Code ("7J4V+2C"); that is not an address. */
const PLUS_CODE = /^[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{0,3}\b/i;

const clean = (part?: string | null) => {
  const text = part?.trim() ?? '';
  return text && !PLUS_CODE.test(text) ? text : '';
};

/** Turns the phone's geocoder answer into a short title and a fuller detail line; never raw coordinates. */
export function formatPlace(address: Location.LocationGeocodedAddress): Place | null {
  const name = clean(address.name);
  const street = [clean(address.streetNumber), clean(address.street)].filter(Boolean).join(' ');
  const area = clean(address.district) || clean(address.subregion);
  const city = clean(address.city);
  const pin = clean(address.postalCode);
  // A bare house number is not a name to show first.
  const title = name && !/^\d+[a-z]?$/i.test(name) ? name : street || area || city;
  if (!title) {
    // Last resort on Android: the formatted line, minus a leading Plus Code and the country.
    const formatted = (address.formattedAddress ?? '').replace(PLUS_CODE, '').replace(/^[,\s]+/, '').replace(/,\s*India$/i, '');
    if (!formatted) return null;
    const [first, ...rest] = formatted.split(',').map((p) => p.trim());
    return { title: first, detail: rest.join(', ') };
  }
  const rest = [street, area, city, pin].filter((p) => p && p !== title && !title.includes(p));
  return { title, detail: [...new Set(rest)].join(', ') };
}

/** The address of a point as one label for the booking (title first, so `placeName` reads the name). */
export const placeLabel = (place: Place) => (place.detail ? `${place.title}, ${place.detail}` : place.title);

/**
 * Reverse-geocodes a point with the phone's own geocoder. Android needs
 * location permission before it will geocode, so without it this reports
 * `permission` (the caller offers "Allow") instead of failing silently.
 * The web has no geocoder.
 */
export async function lookupPlace(point: LatLng): Promise<PlaceLookup> {
  if (Platform.OS === 'web') return { ok: false, reason: 'failed' };
  try {
    if (Platform.OS === 'android') {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) return { ok: false, reason: 'permission' };
    }
    const [address] = await Location.reverseGeocodeAsync(point);
    const place = address ? formatPlace(address) : null;
    return place ? { ok: true, place } : { ok: false, reason: 'empty' };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/**
 * One GPS fix for the map picker: the last known position if it is fresh
 * (instant), else a new fix, given up after `timeoutMs` so the screen never
 * waits forever (C05 "GPS timeout").
 */
export async function currentPoint(timeoutMs = 12_000): Promise<{ ok: true; point: LatLng } | { ok: false; reason: 'denied' | 'blocked' | 'timeout' }> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: permission.canAskAgain ? 'denied' : 'blocked' };
    const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000, requiredAccuracy: 100 }).catch(() => null);
    if (last) return { ok: true, point: { latitude: last.coords.latitude, longitude: last.coords.longitude } };
    const fix = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (!fix) return { ok: false, reason: 'timeout' };
    return { ok: true, point: { latitude: fix.coords.latitude, longitude: fix.coords.longitude } };
  } catch {
    return { ok: false, reason: 'timeout' };
  }
}
