import { useSyncExternalStore } from 'react';

import type { StringKey } from './i18n';

/**
 * Whether Pickr can take a booking right now, and why not when it cannot.
 * The backend will own this (network reachability, weather feed, dispatch
 * load, service areas, the admin "pause bookings" switch: A12). Until it is
 * connected the status is DEMO: a development row in Profile steps through
 * the states so each page can be seen. `setServiceStatus` is the single
 * entry point the real sources will call.
 */
export type ServiceStatus = 'ok' | 'offline' | 'rain' | 'busy' | 'unavailable' | 'out_of_area';

export const SERVICE_STATES: ServiceStatus[] = ['ok', 'offline', 'rain', 'busy', 'unavailable', 'out_of_area'];

type Copy = { icon: string; title: StringKey; body: StringKey; action: StringKey; /** Booking may continue (a warning, not a stop). */ canContinue: boolean };

export const SERVICE_COPY: Record<Exclude<ServiceStatus, 'ok'>, Copy> = {
  offline: { icon: 'wifi-off', title: 'svcOfflineTitle', body: 'svcOfflineBody', action: 'svcRetry', canContinue: false },
  rain: { icon: 'weather-pouring', title: 'svcRainTitle', body: 'svcRainBody', action: 'svcContinueAnyway', canContinue: true },
  busy: { icon: 'truck-alert-outline', title: 'svcBusyTitle', body: 'svcBusyBody', action: 'svcScheduleLater', canContinue: true },
  unavailable: { icon: 'tools', title: 'svcDownTitle', body: 'svcDownBody', action: 'svcRetry', canContinue: false },
  out_of_area: { icon: 'map-marker-off-outline', title: 'svcAreaTitle', body: 'svcAreaBody', action: 'svcChangePlace', canContinue: false },
};

let status: ServiceStatus = 'ok';
const listeners = new Set<() => void>();

export function setServiceStatus(next: ServiceStatus) {
  status = next;
  listeners.forEach((l) => l());
}

export const getServiceStatus = () => status;

export function useServiceStatus() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => status
  );
}
