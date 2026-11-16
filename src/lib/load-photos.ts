import type { ImageSourcePropType } from 'react-native';

import { getItem, VEHICLES, type VehicleId } from './catalog';

/** Pilot rule (D10): at least two clear photos of the loaded truck before it leaves; up to eight. */
export const REQUIRED_PHOTOS = 2;
export const MAX_PHOTOS = 8;

/**
 * A load photo as an image source. Real uploads are URLs or file URIs; DEMO
 * photos are `item:<id>` / `vehicle:<id>` and show the catalogue picture.
 */
export function photoSource(key: string): ImageSourcePropType | undefined {
  if (/^(https?|file|content|blob|data):/.test(key)) return { uri: key };
  const [kind, id] = key.split(':');
  if (kind === 'item') return getItem(id)?.image;
  if (kind === 'vehicle') return VEHICLES[id as VehicleId]?.image;
  return undefined;
}
