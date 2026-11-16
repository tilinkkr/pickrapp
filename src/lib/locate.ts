import * as Location from 'expo-location';

import type { Site } from './booking';

export type LocateResult =
  | { ok: true; site: Site }
  | { ok: false; reason: 'denied'; canAskAgain: boolean }
  | { ok: false; reason: 'failed' };

/**
 * One-off GPS fix turned into a readable site. A failed address lookup still
 * returns the coordinates (labelled `fallbackLabel`), never raw numbers.
 */
export async function locateSite(fallbackLabel: string): Promise<LocateResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: 'denied', canAskAgain: permission.canAskAgain };

    const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const point = { latitude: coords.latitude, longitude: coords.longitude };
    let label = fallbackLabel;
    try {
      const [place] = await Location.reverseGeocodeAsync(point);
      const parts = [place?.name, place?.street, place?.district, place?.city].filter((p): p is string => !!p);
      if (parts.length) label = [...new Set(parts)].join(', ');
    } catch {
      // Keep the coordinates with the fallback label (always the case on web).
    }
    return { ok: true, site: { label, source: 'gps', coords: point } };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
