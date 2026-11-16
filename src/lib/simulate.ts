import { REQUIRED_PHOTOS } from './load-photos';
import { photoCount, type TripEvent } from './trip-machine';
import type { Trip, TripStage } from './trips';

/**
 * DEMO driver until the driver app and backend exist. It plays the driver's
 * part by sending the same state-machine events the driver app will send
 * (trip-machine.ts). Driver details are clearly fake and carry no phone
 * number, so nobody real is called.
 */
const DEMO_DRIVER = { name: 'Rajesh Kumar (demo)', phone: '', verified: true, stats: { trips: 412, onTimePct: 97, cancels: 0 } };

const NEXT: Partial<Record<TripStage, (trip: Trip) => TripEvent>> = {
  searching: () => ({ type: 'ACCEPT', driver: DEMO_DRIVER, registration: 'KL-08-AB-4567', etaMinutes: 12, distanceKm: 3.4 }),
  to_pickup: () => ({ type: 'ARRIVE_PICKUP' }),
  // The driver adds the two required photos first (DEMO: catalogue pictures), then leaves.
  loading: (trip) =>
    photoCount(trip) < REQUIRED_PHOTOS
      ? { type: 'PHOTO_ADDED', uri: photoCount(trip) === 0 ? `item:${trip.itemId ?? ''}` : `vehicle:${trip.vehicleId ?? ''}` }
      : { type: 'START_TRIP', etaMinutes: 18, distanceKm: 6.2 },
  in_transit: () => ({ type: 'ARRIVE_DROP' }),
  unloading: () => ({ type: 'UNLOADED' }),
  payment_due: () => ({ type: 'PAID', method: 'upi' }),
};

export const canSimulate = (trip: Trip) => NEXT[trip.stage] !== undefined;

/** The driver's next button press for this stage. */
export function simulateNext(trip: Trip): TripEvent | null {
  return NEXT[trip.stage]?.(trip) ?? null;
}

/** One demo tick on the road: a minute closer and a fresh location ping; arrival moves the stage on. */
export function simulateDrive(trip: Trip): TripEvent | null {
  if ((trip.stage !== 'to_pickup' && trip.stage !== 'in_transit') || trip.etaMinutes == null) return null;
  const eta = trip.etaMinutes - 1;
  if (eta <= 0) return simulateNext(trip);
  const perMinute = (trip.distanceKm ?? 0) / trip.etaMinutes;
  return {
    type: 'LOCATION',
    etaMinutes: eta,
    distanceKm: Math.max(0, Math.round(((trip.distanceKm ?? 0) - perMinute) * 10) / 10),
  };
}
