import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { Site } from './booking';

export type SavedSite = Site & {
  id: string;
  /** Bookings that used this site as pickup or delivery. */
  uses: number;
  lastUsed: string;
  /** Pinned by the customer; pinned sites stay at the top. */
  pinned: boolean;
  /** Customer's own short name for the site ("Home site", "Godown"); the address stays in `label`. */
  name?: string;
};

type SitesContextValue = {
  /** Pinned first, then most booked, then most recent. */
  favourites: SavedSite[];
  recordUse: (sites: Site[]) => void;
  togglePin: (id: string) => void;
  /** Adds a site the customer typed in Favourites; it starts pinned so it is easy to find. */
  addSite: (site: { name?: string; label: string; coords?: Site['coords'] }) => void;
  editSite: (id: string, patch: { name?: string; label?: string; coords?: Site['coords'] }) => void;
  removeSite: (id: string) => void;
};

const STORAGE_KEY = 'pickr.sites';
const SitesContext = createContext<SitesContextValue | null>(null);

const keyOf = (label: string) => label.trim().toLowerCase().replace(/\s+/g, ' ');

/** Favourite sites (handoff C04 "recent/saved", meeting 2026-11-04 "most booked"), kept on this phone. */
export function SitesProvider({ children }: PropsWithChildren) {
  const [sites, setSites] = useState<SavedSite[]>([]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!cancelled && raw) setSites(JSON.parse(raw) as SavedSite[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback((updater: (prev: SavedSite[]) => SavedSite[]) => {
    setSites((prev) => {
      const next = updater(prev);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const recordUse = useCallback(
    (used: Site[]) => {
      const now = new Date().toISOString();
      save((prev) => {
        const next = [...prev];
        for (const site of used) {
          const existing = next.find((s) => keyOf(s.label) === keyOf(site.label));
          if (existing) {
            existing.uses += 1;
            existing.lastUsed = now;
            existing.coords = site.coords ?? existing.coords;
          } else {
            next.push({ ...site, id: `site-${Date.now()}-${next.length}`, uses: 1, lastUsed: now, pinned: false });
          }
        }
        return next;
      });
    },
    [save]
  );

  const togglePin = useCallback(
    (id: string) => save((prev) => prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))),
    [save]
  );

  const addSite = useCallback<SitesContextValue['addSite']>(
    (site) =>
      save((prev) => [
        ...prev,
        { ...site, source: 'manual', id: `site-${Date.now()}`, uses: 0, lastUsed: new Date().toISOString(), pinned: true },
      ]),
    [save]
  );

  const editSite = useCallback<SitesContextValue['editSite']>(
    (id, patch) => save((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s))),
    [save]
  );

  const removeSite = useCallback<SitesContextValue['removeSite']>((id) => save((prev) => prev.filter((s) => s.id !== id)), [save]);

  const value = useMemo<SitesContextValue>(() => {
    const favourites = [...sites].sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) || b.uses - a.uses || b.lastUsed.localeCompare(a.lastUsed)
    );
    return { favourites, recordUse, togglePin, addSite, editSite, removeSite };
  }, [sites, recordUse, togglePin, addSite, editSite, removeSite]);

  return <SitesContext.Provider value={value}>{children}</SitesContext.Provider>;
}

export function useSites() {
  const value = useContext(SitesContext);
  if (!value) throw new Error('useSites must be used inside SitesProvider');
  return value;
}

/** A saved site as a booking site, keeping its coordinates. */
export const asSite = (saved: SavedSite): Site => ({ label: saved.label, source: 'saved', coords: saved.coords });
