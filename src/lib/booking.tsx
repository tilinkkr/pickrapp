import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { type CategoryId, getItem, QUANTITY, quoteTrucks, type VehicleId } from './catalog';
import type { OtherPerson } from './people';
import type { ScheduleInput } from './schedule';

export type Site = {
  /** What the customer sees and the driver reads; never raw coordinates. */
  label: string;
  source: 'gps' | 'manual' | 'map' | 'saved';
  coords?: { latitude: number; longitude: number };
};

export type BookingDraft = {
  /** Category the customer started from, used to open step 1 on the right group. */
  category?: CategoryId;
  itemId?: string;
  /** Units, bricks or blocks, depending on the material's measure. */
  quantity: number;
  /** Chosen truck; unset means "use the recommendation". */
  vehicleId?: VehicleId;
  pickup: Site | null;
  delivery: Site | null;
  notes: string;
  transitPass: string;
  /** Photo of the KOMPAS mineral transit pass (local URI), required before review for sand, jelly and soil. */
  transitPassPhoto?: string;
  when: { mode: 'now' } | ({ mode: 'schedule' } & ScheduleInput);
  /** Booking for someone else: who meets the truck and who pays the driver. Unset means "for me". */
  forOther?: OtherPerson | null;
};

const EMPTY: BookingDraft = {
  quantity: QUANTITY.units.initial,
  pickup: null,
  delivery: null,
  notes: '',
  transitPass: '',
  when: { mode: 'now' },
};

export const BOOKING_STEPS = 5;

/** Materials that need a transit pass get one more step (the pass upload) before review. */
export const stepsFor = (itemId?: string) => (getItem(itemId)?.transitPass ? BOOKING_STEPS + 1 : BOOKING_STEPS);

/** The pass is ready when it has both a number and a photo. */
export const passReady = (draft: BookingDraft) => draft.transitPass.trim().length >= 6 && Boolean(draft.transitPassPhoto);

const STORAGE_KEY = 'pickr.draft';

/** Booking routes in order; resuming pushes them all so Back walks the steps as usual. */
export const BOOKING_PATH = ['/book/material', '/book/route', '/book/site'] as const;

/** How far a draft got: 0 = nothing chosen, 1 = material, 2 = both sites too. */
export function draftProgress(draft: BookingDraft) {
  if (!draft.itemId) return 0;
  return draft.pickup && draft.delivery ? 2 : 1;
}

type BookingContextValue = {
  draft: BookingDraft;
  /** Fresh draft, optionally opened on a category or with a favourite site as delivery. */
  start: (options?: { category?: CategoryId; delivery?: Site; itemId?: string }) => void;
  /** A different material resets quantity to its default and clears the truck choice. */
  chooseItem: (itemId: string) => void;
  setQuantity: (quantity: number) => void;
  setVehicle: (vehicleId: VehicleId) => void;
  update: (patch: Partial<Pick<BookingDraft, 'pickup' | 'delivery' | 'notes' | 'transitPass' | 'transitPassPhoto' | 'when' | 'forOther'>>) => void;
  reset: () => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

/** One in-progress booking, kept while the customer moves back and forth between steps. */
export function BookingProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<BookingDraft>(EMPTY);
  const loaded = useRef(false);

  // An unfinished booking survives closing the app, like a cart.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setDraft((current) => (current.itemId ? current : { ...EMPTY, ...(JSON.parse(raw) as Partial<BookingDraft>) }));
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    if (draftProgress(draft) === 0) AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    else AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draft)).catch(() => {});
  }, [draft]);

  const start = useCallback<BookingContextValue['start']>((options) => {
    const item = getItem(options?.itemId);
    setDraft({
      ...EMPTY,
      category: item?.category ?? options?.category,
      itemId: item?.id,
      quantity: item ? QUANTITY[item.measure].initial : EMPTY.quantity,
      delivery: options?.delivery ?? null,
    });
  }, []);

  const chooseItem = useCallback((itemId: string) => {
    setDraft((d) => {
      const item = getItem(itemId);
      if (!item || d.itemId === itemId) return d;
      const sameMeasure = getItem(d.itemId)?.measure === item.measure;
      return {
        ...d,
        category: item.category,
        itemId,
        quantity: sameMeasure ? d.quantity : QUANTITY[item.measure].initial,
        vehicleId: undefined,
      };
    });
  }, []);

  const setQuantity = useCallback((quantity: number) => {
    setDraft((d) => {
      const item = getItem(d.itemId);
      const bounds = QUANTITY[item?.measure ?? 'units'];
      return { ...d, quantity: Math.min(bounds.max, Math.max(bounds.min, quantity)) };
    });
  }, []);

  const setVehicle = useCallback((vehicleId: VehicleId) => setDraft((d) => ({ ...d, vehicleId })), []);
  const update = useCallback<BookingContextValue['update']>((patch) => setDraft((d) => ({ ...d, ...patch })), []);
  const reset = useCallback(() => setDraft(EMPTY), []);

  const value = useMemo(
    () => ({ draft, start, chooseItem, setQuantity, setVehicle, update, reset }),
    [draft, start, chooseItem, setQuantity, setVehicle, update, reset]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const value = useContext(BookingContext);
  if (!value) throw new Error('useBooking must be used inside BookingProvider');
  return value;
}

/** The material, every truck quote for the quantity, and the one in force (chosen or recommended). */
export function useQuote() {
  const { draft } = useBooking();
  const item = getItem(draft.itemId);
  const quotes = item ? quoteTrucks(item, draft.quantity) : [];
  const chosen = quotes.find((q) => q.vehicle.id === draft.vehicleId) ?? quotes[0];
  return { item, quotes, chosen };
}
