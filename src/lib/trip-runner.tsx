import { useEffect } from 'react';

import { simulateDrive, simulateNext } from '@/lib/simulate';
import { REQUIRED_PHOTOS } from '@/lib/load-photos';
import { photoCount, searchStart } from '@/lib/trip-machine';
import { useTrips } from '@/lib/trips';

/** Rule 6: a search runs five minutes. */
export const SEARCH_MS = 5 * 60_000;
const DRIVE_TICK_MS = 3000;
/** DEMO dispatch: how long a fresh search "takes" before the (demo) driver accepts. */
const DEMO_MATCH_MS = 9000;
/** DEMO: the driver uploads a load photo this often while loading. */
const DEMO_PHOTO_MS = 7000;

/**
 * Keeps trips moving wherever the customer is in the app, so the trip screen
 * can be minimised and Home's live bar stays current. Everything goes through
 * the state machine (`dispatch`), never raw patches.
 *
 * - a scheduled request starts its search at its time;
 * - a search expires after five minutes (rule 6);
 * - DEMO: a driver accepts and drives, until the driver app reports progress.
 */
export function TripRunner() {
  const { activeTrip: trip, nextScheduled, dispatch } = useTrips();
  const id = trip?.id;
  const stage = trip?.stage;
  const searchFrom = trip?.stage === 'searching' ? searchStart(trip) : undefined;
  const simulated = trip?.simulated;
  const photos = trip ? photoCount(trip) : 0;
  const scheduledId = nextScheduled?.id;
  const scheduledAt = nextScheduled?.when.getTime();

  // The scheduled time has come: the search begins.
  useEffect(() => {
    if (!scheduledId || scheduledAt === undefined) return;
    const timer = setTimeout(() => dispatch(scheduledId, { type: 'START_SEARCH' }), Math.max(0, scheduledAt - Date.now()));
    return () => clearTimeout(timer);
  }, [scheduledId, scheduledAt, dispatch]);

  // Five minutes without an acceptance: "No truck found".
  useEffect(() => {
    if (!id || searchFrom === undefined) return;
    const timer = setTimeout(() => dispatch(id, { type: 'EXPIRE' }), Math.max(0, SEARCH_MS - (Date.now() - searchFrom)));
    return () => clearTimeout(timer);
  }, [id, searchFrom, dispatch]);

  // DEMO dispatch: the (demo) driver accepts after a short pause.
  useEffect(() => {
    if (!id || stage !== 'searching') return;
    const timer = setTimeout(() => dispatch(id, simulateNext), DEMO_MATCH_MS);
    return () => clearTimeout(timer);
  }, [id, stage, dispatch]);

  // DEMO loading: the driver uploads the two required photos, one at a time. Leaving stays the driver's call.
  useEffect(() => {
    if (!id || !simulated || stage !== 'loading' || photos >= REQUIRED_PHOTOS) return;
    const timer = setTimeout(() => dispatch(id, simulateNext), DEMO_PHOTO_MS);
    return () => clearTimeout(timer);
  }, [id, simulated, stage, photos, dispatch]);

  // DEMO driving: a minute closer every few seconds until arrival.
  useEffect(() => {
    if (!id || !simulated || (stage !== 'to_pickup' && stage !== 'in_transit')) return;
    const timer = setInterval(() => dispatch(id, simulateDrive), DRIVE_TICK_MS);
    return () => clearInterval(timer);
  }, [id, simulated, stage, dispatch]);

  return null;
}
