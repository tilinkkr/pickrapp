import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * DEMO weather until a weather source is connected: a development switch in
 * Profile says "it is raining", which adds the demo rain surcharge to new
 * quotes and shows the rain animation on the price. Off by default.
 */
const KEY = 'pickr.demoRain';
let raining = false;
const listeners = new Set<() => void>();

AsyncStorage.getItem(KEY)
  .then((value) => {
    raining = value === '1';
    listeners.forEach((l) => l());
  })
  .catch(() => {});

export function setDemoRain(on: boolean) {
  raining = on;
  AsyncStorage.setItem(KEY, on ? '1' : '0').catch(() => {});
  listeners.forEach((l) => l());
}

export function useDemoRain() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => raining
  );
}
