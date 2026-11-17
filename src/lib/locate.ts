import * as Location from 'expo-location';

import type { Site } from './booking';
import { lookupPlace, placeLabel } from './geocode';
import { inServiceArea } from './service-area';

export type LocateResult =
  | { ok: true; site: Site }
  | { ok: false; reason: 'denied'; canAskAgain: boolean }
  | { ok: false; reason: 'outside' }
  | { ok: false; reason: 'failed' };

/**
 * One-off GPS fix turned into a readable site. A failed address lookup still
 * returns the coordinates (labelled `fallbackLabel`), never raw numbers. A
 * fix outside the service area is refused (rule 1), so the customer picks the
 * site on the map or types it instead.
 */
export async function locateSite(fallbackLabel: string): Promise<LocateResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: 'denied', canAskAgain: permission.canAskAgain };

    const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const point = { latitude: coords.latitude, longitude: coords.longitude };
    if (!inServiceArea(point)) return { ok: false, reason: 'outside' };
    const found = await lookupPlace(point);
    return { ok: true, site: { label: found.ok ? placeLabel(found.place) : fallbackLabel, source: 'gps', coords: point } };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
