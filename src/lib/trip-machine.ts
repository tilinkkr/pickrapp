import { tripFare } from './fare';
import { MAX_PHOTOS, REQUIRED_PHOTOS } from './load-photos';
import type { Trip, TripStage } from './trips';

/**
 * The trip state machine, one place for every stage change. It mirrors the
 * pilot server (docs/PILOT_APK_ANALYSIS.md §1): each event names who may send
 * it, the stages it is valid from, and what it records. Screens, the demo
 * simulator and the runner all go through `applyEvent`, so a stage can never
 * change without its timestamps and side effects, and an event that arrives
 * late (a stale tick after cancelling) is simply refused.
 */
export type TripEvent =
  /** System: the scheduled time has come, or the customer retries after "No truck found". */
  | { type: 'START_SEARCH' }
  /** Driver app: first valid acceptance wins (rule 7). */
  | { type: 'ACCEPT'; driver: NonNullable<Trip['driver']>; registration: string; etaMinutes?: number; distanceKm?: number }
  /** Driver app: position ping while moving; no stage change. */
  | { type: 'LOCATION'; etaMinutes?: number; distanceKm?: number }
  | { type: 'ARRIVE_PICKUP' }
  /** Driver app: one load photo, sent only once the upload is acknowledged (rule 9). */
  | { type: 'PHOTO_ADDED'; uri: string }
  /** Driver app: leaves pickup. Refused until two photos are in, unless the pilot skip was recorded (rule 13). */
  | { type: 'START_TRIP'; photosSkipped?: boolean; etaMinutes?: number; distanceKm?: number }
  | { type: 'ARRIVE_DROP' }
  | { type: 'UNLOADED' }
  /** Driver app: full payment received directly (rule 8 releases the driver only here). */
  | { type: 'PAID'; method: 'cash' | 'upi' }
  /** Driver app: cannot do this job, before the load leaves (D15). The customer goes back to searching. */
  | { type: 'RELEASE'; reason?: string }
  /** Customer: before the truck reaches pickup (C20). */
  | { type: 'CANCEL'; reason: string }
  /** System: five minutes without an acceptance (rule 6). */
  | { type: 'EXPIRE' };

type EventType = TripEvent['type'];

/** Valid source stages and the stage each event leads to (undefined: stays put). */
const RULES: Record<EventType, { from: TripStage[]; to?: TripStage; server: string }> = {
  START_SEARCH: { from: ['scheduled', 'no_driver'], to: 'searching', server: 'RETRY' },
  ACCEPT: { from: ['searching'], to: 'to_pickup', server: 'ACCEPTED' },
  LOCATION: { from: ['to_pickup', 'in_transit'], server: 'driver/position' },
  ARRIVE_PICKUP: { from: ['to_pickup'], to: 'loading', server: 'AT_PICKUP' },
  PHOTO_ADDED: { from: ['loading'], server: 'upload' },
  START_TRIP: { from: ['loading'], to: 'in_transit', server: 'IN_TRANSIT' },
  ARRIVE_DROP: { from: ['in_transit'], to: 'unloading', server: 'AT_DROP' },
  UNLOADED: { from: ['unloading'], to: 'payment_due', server: 'COMPLETED' },
  PAID: { from: ['payment_due'], to: 'completed', server: 'PAYMENT_RECEIVED' },
  RELEASE: { from: ['to_pickup', 'loading'], to: 'searching', server: 'RELEASE' },
  CANCEL: { from: ['scheduled', 'searching', 'to_pickup'], to: 'cancelled', server: 'CANCEL' },
  EXPIRE: { from: ['searching'], to: 'no_driver', server: 'NO_DRIVERS' },
};

/** Pilot config: after acceptance the customer pays the lower of ₹100 and 10% of the fare. */
const FEE_AFTER_ACCEPT = 100;
const FEE_SHARE = 0.1;

export const canApply = (trip: Trip, type: EventType) => RULES[type].from.includes(trip.stage);

/** Photos the driver has uploaded so far, and whether the truck may leave pickup. */
export const photoCount = (trip: Trip) => trip.loadPhotos?.length ?? 0;
export const photosDone = (trip: Trip) => photoCount(trip) >= REQUIRED_PHOTOS || Boolean(trip.photosSkipped);

/** The pilot server action this event corresponds to, for when the API is connected. */
export const serverAction = (type: EventType) => RULES[type].server;

/** What cancelling now would cost; 0 before a driver accepts. */
export function cancelFee(trip: Trip) {
  if (trip.stage !== 'to_pickup') return 0;
  const fare = trip.quote ?? trip.amount ?? 0;
  return Math.min(FEE_AFTER_ACCEPT, Math.round(fare * FEE_SHARE));
}

/** DEMO start PIN: four digits from the trip and acceptance time, until the server issues one. */
function startPin(id: string, now: Date) {
  let h = now.getTime() % 100_000;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 1_000_003;
  return String(1000 + (h % 9000));
}

/** The search start the five-minute timer counts from (pilot: max(search_started_at, scheduledFor)). */
export const searchStart = (trip: Trip) => Math.max(trip.searchStartedAt?.getTime() ?? 0, trip.when.getTime());

/**
 * The patch an event makes, or null when the event is not valid from the
 * trip's current stage. Pure: no clock other than `now`, no side effects.
 */
export function applyEvent(trip: Trip, event: TripEvent, now = new Date()): Partial<Trip> | null {
  if (!canApply(trip, event.type)) return null;
  const to = RULES[event.type].to;
  const stage = to ? { stage: to } : {};

  switch (event.type) {
    case 'START_SEARCH':
      return { ...stage, searchStartedAt: now };
    case 'ACCEPT':
      return {
        ...stage,
        driver: event.driver,
        registration: event.registration,
        etaMinutes: event.etaMinutes,
        distanceKm: event.distanceKm,
        assignedAt: now,
        lastLocationAt: now,
        releaseReason: undefined,
        pin: startPin(trip.id, now),
      };
    case 'LOCATION':
      return { etaMinutes: event.etaMinutes, distanceKm: event.distanceKm, lastLocationAt: now };
    case 'ARRIVE_PICKUP':
      return { ...stage, pickupAt: now, etaMinutes: undefined, distanceKm: undefined, lastLocationAt: now, loadPhotos: [] };
    case 'PHOTO_ADDED': {
      const photos = trip.loadPhotos ?? [];
      if (photos.length >= MAX_PHOTOS || photos.includes(event.uri)) return null;
      return { loadPhotos: [...photos, event.uri] };
    }
    case 'START_TRIP':
      if (!event.photosSkipped && !photosDone(trip)) return null;
      return {
        ...stage,
        startedAt: now,
        photosSkipped: event.photosSkipped || undefined,
        etaMinutes: event.etaMinutes,
        distanceKm: event.distanceKm,
        lastLocationAt: now,
      };
    case 'ARRIVE_DROP':
      return { ...stage, dropAt: now, etaMinutes: undefined, distanceKm: 0, lastLocationAt: now };
    case 'UNLOADED':
      // Final amount includes waiting beyond the free time at both sites (rule 5).
      return { ...stage, completedAt: now, amount: tripFare({ ...trip, completedAt: now }, now.getTime()).total };
    case 'PAID':
      return { ...stage, paid: true, paymentMethod: event.method, paidAt: now };
    case 'RELEASE':
      // The driver loses the job; their details and the pickup clock go with them.
      return {
        ...stage,
        releaseReason: event.reason,
        driver: undefined,
        registration: undefined,
        pin: undefined,
        assignedAt: undefined,
        pickupAt: undefined,
        etaMinutes: undefined,
        distanceKm: undefined,
        lastLocationAt: undefined,
        searchStartedAt: now,
      };
    case 'CANCEL':
      return { ...stage, cancelReason: event.reason, cancelFee: cancelFee(trip) };
    case 'EXPIRE':
      return stage;
  }
}
