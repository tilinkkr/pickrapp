import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { OtherPerson } from './people';
import { applyEvent, type TripEvent } from './trip-machine';

/** Trip stages from the handoff's permission matrix (section 9). */
export type TripStage =
  | 'scheduled'
  | 'searching'
  | 'to_pickup'
  | 'loading'
  | 'in_transit'
  | 'unloading'
  | 'payment_due'
  | 'completed'
  | 'cancelled'
  | 'no_driver';

export type Trip = {
  id: string;
  code: string;
  stage: TripStage;
  material: string;
  quantity: string;
  vehicle: string;
  /** Registration of the assigned truck, once a driver has accepted. */
  registration?: string;
  pickup: string;
  delivery: string;
  /** When the booking was made, or the scheduled pickup for scheduled trips. */
  when: Date;
  etaMinutes?: number;
  /** When the driver's phone last reported its location; may be stale. */
  lastLocationAt?: Date;
  notes?: string;
  /** The approximate range quoted at booking, so every screen shows the same figures. */
  estimate?: { low: number; high: number };
  /** Estimate before completion, final amount after. */
  amount?: number;
  paid?: boolean;
  /** Assigned driver, once one accepts (C14). */
  driver?: {
    name: string;
    phone: string;
    verified: boolean;
    /** Track record from the server, when known; trust tags are only shown from real numbers. */
    stats?: { trips: number; onTimePct: number; cancels: number };
  };
  /** Four-digit start PIN the customer reads to the driver at pickup (DEMO until the server issues it). */
  pin?: string;
  /** Road distance left to the current target, when known. */
  distanceKm?: number;
  /** Site coordinates when picked by GPS or on the map; typed addresses have none. */
  pickupCoords?: { latitude: number; longitude: number };
  deliveryCoords?: { latitude: number; longitude: number };
  transitPass?: string;
  /** Payment method recorded by the driver (C13): cash or direct UPI. */
  paymentMethod?: 'cash' | 'upi';
  /** How the customer said they will pay (Profile › Payments), shown to the driver. */
  payPreference?: 'gpay' | 'whatsapp' | 'cash';
  paidAt?: Date;
  /** When a driver accepted; drives the brief "driver found" moment on the tracking screen. */
  assignedAt?: Date;
  cancelReason?: string;
  /** Cancellation charge recorded at cancel time: 0 while searching, min(₹100, 10%) after acceptance (pilot rule). */
  cancelFee?: number;
  /** When the current five-minute search began (pilot `search_started_at`); a retry starts a new one. */
  searchStartedAt?: Date;
  /** Why the last driver released the job; the customer is back to searching (rule 10). */
  releaseReason?: string;
  /** Progress comes from the demo simulator, not a real driver. */
  simulated?: boolean;
  /** Catalogue ids, for photos and pricing rules. */
  itemId?: string;
  vehicleId?: string;
  /** The transport quote at booking (centre of the estimate range); `amount` becomes the final figure. */
  quote?: number;
  /** DEMO: a rain surcharge applied to this trip. */
  rain?: boolean;
  /** Pilot timestamps (docs/PILOT_APK_ANALYSIS.md §1): arrived at pickup, left with the load, arrived at drop, unloading finished. */
  pickupAt?: Date;
  startedAt?: Date;
  dropAt?: Date;
  completedAt?: Date;
  /** Load photos the driver added before leaving pickup (C10); DEMO entries name catalogue images. */
  loadPhotos?: string[];
  photosSkipped?: boolean;
  /** Booked for someone else: who meets the truck, where, and who pays the driver. */
  forOther?: OtherPerson;
};

/** Pilot server statuses (shared with the driver app) for each stage of this app. */
export const SERVER_STATUS: Record<TripStage, string> = {
  scheduled: 'SEARCHING',
  searching: 'SEARCHING',
  to_pickup: 'ACCEPTED',
  loading: 'AT_PICKUP',
  in_transit: 'IN_TRANSIT',
  unloading: 'AT_DROP',
  payment_due: 'COMPLETED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  no_driver: 'NO_DRIVERS',
};

/**
 * Allowed stage changes (the driver app's buttons, the search timer and the
 * customer's cancel). Anything else is refused, so a late or duplicated
 * update can never move a trip backwards or skip payment (rules 8 and 9).
 */
const NEXT_STAGES: Record<TripStage, TripStage[]> = {
  scheduled: ['searching', 'cancelled'],
  searching: ['to_pickup', 'no_driver', 'cancelled'],
  to_pickup: ['loading', 'searching', 'cancelled'],
  loading: ['in_transit', 'searching'],
  in_transit: ['unloading'],
  unloading: ['payment_due'],
  payment_due: ['completed'],
  completed: [],
  cancelled: [],
  no_driver: ['searching'],
};

export const canMove = (from: TripStage, to: TripStage) => from === to || NEXT_STAGES[from].includes(to);

/** Every stage where the trip still reserves the customer (rule 8 and C02). */
const ACTIVE: TripStage[] = ['searching', 'to_pickup', 'loading', 'in_transit', 'unloading', 'payment_due'];
export const isActive = (trip: Trip) => ACTIVE.includes(trip.stage);
export const isRequest = (trip: Trip) => trip.stage === 'scheduled' || trip.stage === 'searching';
export const isPast = (trip: Trip) => ['completed', 'cancelled', 'no_driver'].includes(trip.stage);

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
const daysFromNow = (d: number, hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() + d);
  date.setHours(hour, 0, 0, 0);
  return date;
};

// DEMO DATA until the trips backend exists. Kept in Kerala to match the pilot.
const DEMO_HISTORY: Trip[] = [
  {
    id: 'demo-3',
    code: 'PK-2418',
    stage: 'scheduled',
    material: 'M-Sand',
    quantity: '2 units',
    vehicle: 'Medium Tipper (2 unit)',
    pickup: 'Ollur Sand Yard, Thrissur',
    delivery: 'Ayyanthole site, Thrissur',
    when: daysFromNow(1, 8),
    amount: 3150,
  },
  {
    id: 'demo-2',
    code: 'PK-2391',
    stage: 'completed',
    material: '20mm Jelly',
    quantity: '1 unit',
    vehicle: 'Tipper Lorry (1 unit)',
    registration: 'KL-08-BK-2207',
    pickup: 'Pudukad Quarry, Thrissur',
    delivery: 'Ayyanthole site, Thrissur',
    when: minutesAgo(60 * 26),
    itemId: 'jelly-20',
    vehicleId: 'tipper-1',
    quote: 2460,
    amount: 2484,
    paid: true,
    paymentMethod: 'upi',
    driver: { name: 'Suresh P (demo)', phone: '', verified: true },
    pickupAt: minutesAgo(60 * 25 + 30),
    startedAt: minutesAgo(60 * 25 - 3),
    dropAt: minutesAgo(60 * 24 + 25),
    completedAt: minutesAgo(60 * 24 + 15),
    paidAt: minutesAgo(60 * 24 + 10),
    loadPhotos: ['item:jelly-20', 'vehicle:tipper-1'],
  },
  {
    id: 'demo-1',
    code: 'PK-2355',
    stage: 'cancelled',
    material: 'Bricks',
    quantity: '2,000 bricks',
    vehicle: '14ft Lorry',
    pickup: 'Mannuthy Brick Works, Thrissur',
    delivery: 'Kuriachira site, Thrissur',
    when: minutesAgo(60 * 24 * 4),
  },
];

const DEMO_ACTIVE: Trip = {
  id: 'demo-active',
  code: 'PK-2422',
  stage: 'to_pickup',
  material: 'River Sand',
  quantity: '1 unit',
  vehicle: 'Tipper Lorry (1 unit)',
  registration: 'KL-07-CD-4091',
  pickup: 'Ollur Sand Yard, Thrissur',
  delivery: 'Ayyanthole site, Thrissur',
  when: minutesAgo(18),
  etaMinutes: 24,
  amount: 1890,
};

type TripsContextValue = {
  /** The customer's own requests first (newest first), then any demo trips. */
  trips: Trip[];
  activeTrip: Trip | undefined;
  /** The next scheduled request, for Home when nothing is active. */
  nextScheduled: Trip | undefined;
  /** Records a submitted booking request. No backend yet, so it is saved on this phone. */
  addTrip: (trip: Omit<Trip, 'id' | 'code'>) => Trip;
  /** Applies a change to one of the customer's own trips (simulated progress, cancellation). */
  updateTrip: (id: string, patch: Partial<Trip> | ((trip: Trip) => Partial<Trip>)) => void;
  /** Sends one state-machine event (trip-machine.ts); refused silently when it is not valid from the current stage. */
  dispatch: (id: string, event: TripEvent | ((trip: Trip) => TripEvent | null)) => void;
  /** Dev-only: adds demo trips (one active) so the dispatch card and booking lock can be seen. */
  demoActive: boolean;
  setDemoActive: (on: boolean) => void;
};

const STORAGE_KEY = 'pickr.trips';

const DATE_FIELDS = ['when', 'lastLocationAt', 'paidAt', 'assignedAt', 'pickupAt', 'startedAt', 'dropAt', 'completedAt', 'searchStartedAt'] as const;
type StoredTrip = Omit<Trip, (typeof DATE_FIELDS)[number]> & Partial<Record<(typeof DATE_FIELDS)[number], string>>;

const revive = (stored: StoredTrip): Trip => {
  const trip = { ...stored } as unknown as Trip;
  for (const field of DATE_FIELDS) {
    const value = stored[field];
    (trip as Record<string, unknown>)[field] = value ? new Date(value) : undefined;
  }
  return trip;
};

const persist = (trips: Trip[]) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trips)).catch(() => {});
};

const TripsContext = createContext<TripsContextValue | null>(null);

export function TripsProvider({ children }: PropsWithChildren) {
  const [ownTrips, setOwnTrips] = useState<Trip[]>([]);
  const [demoTrip, setDemoTrip] = useState<Trip | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!cancelled && raw) setOwnTrips((JSON.parse(raw) as StoredTrip[]).map(revive));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const addTrip = useCallback<TripsContextValue['addTrip']>((input) => {
    const trip: Trip = {
      ...input,
      id: `trip-${Date.now()}`,
      // DEMO trip code until the backend issues real ones.
      code: `PK-${String(Math.floor(2500 + Math.random() * 7000))}`,
    };
    setOwnTrips((prev) => {
      const next = [trip, ...prev];
      persist(next);
      return next;
    });
    return trip;
  }, []);

  const updateTrip = useCallback<TripsContextValue['updateTrip']>((id, patch) => {
    setOwnTrips((prev) => {
      const next = prev.map((t) => {
        if (t.id !== id) return t;
        const change = typeof patch === 'function' ? patch(t) : patch;
        // The state machine refuses impossible moves (e.g. a stale tick after cancelling).
        if (change.stage && !canMove(t.stage, change.stage)) return t;
        return { ...t, ...change };
      });
      persist(next);
      return next;
    });
  }, []);

  const dispatch = useCallback<TripsContextValue['dispatch']>((id, input) => {
    const step = (t: Trip) => {
      const event = typeof input === 'function' ? input(t) : input;
      const patch = event ? applyEvent(t, event) : null;
      return patch ? { ...t, ...patch } : t;
    };
    setOwnTrips((prev) => {
      if (!prev.some((t) => t.id === id)) return prev;
      const next = prev.map((t) => (t.id === id ? step(t) : t));
      persist(next);
      return next;
    });
    // The dev demo trip follows the same machine, so it can be stepped through too.
    setDemoTrip((demo) => (demo && demo.id === id ? step(demo) : demo));
  }, []);

  const setDemoActive = useCallback((on: boolean) => {
    // Stamp times at switch-on so the freshness label starts at "40 seconds ago" and then ages.
    setDemoTrip(
      on ? { ...DEMO_ACTIVE, when: new Date(Date.now() - 18 * 60_000), lastLocationAt: new Date(Date.now() - 40_000) } : null
    );
  }, []);

  const value = useMemo<TripsContextValue>(() => {
    const trips = demoTrip ? [...ownTrips, demoTrip, ...DEMO_HISTORY] : ownTrips;
    const nextScheduled = trips
      .filter((t) => t.stage === 'scheduled')
      .sort((a, b) => a.when.getTime() - b.when.getTime())[0];
    return {
      trips,
      activeTrip: trips.find(isActive),
      nextScheduled,
      addTrip,
      updateTrip,
      dispatch,
      demoActive: demoTrip !== null,
      setDemoActive,
    };
  }, [ownTrips, demoTrip, addTrip, updateTrip, dispatch, setDemoActive]);

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips() {
  const value = useContext(TripsContext);
  if (!value) throw new Error('useTrips must be used inside TripsProvider');
  return value;
}
