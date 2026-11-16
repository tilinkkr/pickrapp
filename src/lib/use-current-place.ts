import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

/** The handoff's home location variants (C02): locating, address, denied, GPS unavailable, address failure. */
export type PlaceState =
  | { status: 'locating' }
  | { status: 'ready'; label: string }
  | { status: 'no-address' }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'unavailable' };

function placeLabel(place: Location.LocationGeocodedAddress | undefined) {
  if (!place) return '';
  const area = place.district ?? place.subregion ?? place.name;
  const parts = [area, place.city].filter((part): part is string => !!part);
  return [...new Set(parts)].join(', ');
}

/**
 * The customer's current area for the Home header. Location never limits
 * booking (rule 1): sites are chosen separately, so every failure here is
 * informational and retryable.
 */
export function useCurrentPlace() {
  const [state, setState] = useState<PlaceState>({ status: 'locating' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const update = (next: PlaceState) => {
      if (!cancelled) setState(next);
    };

    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          update({ status: 'denied', canAskAgain: permission.canAskAgain });
          return;
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        try {
          const [place] = await Location.reverseGeocodeAsync(position.coords);
          const label = placeLabel(place);
          update(label ? { status: 'ready', label } : { status: 'no-address' });
        } catch {
          // Coordinates are fine; only the address lookup failed (always on web).
          update({ status: 'no-address' });
        }
      } catch {
        update({ status: 'unavailable' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    if (state.status === 'denied' && !state.canAskAgain) {
      Linking.openSettings().catch(() => {});
      return;
    }
    setState({ status: 'locating' });
    setAttempt((n) => n + 1);
  }, [state]);

  return { place: state, retry };
}
