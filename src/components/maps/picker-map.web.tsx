import type { Ref } from 'react';

export type LatLng = { latitude: number; longitude: number };

export type PickerMapHandle = {
  centerOn: (point: LatLng) => void;
  zoomBy: (delta: number) => void;
};

type PickerMapProps = {
  initial: LatLng;
  onMoveStart: () => void;
  onIdle: (point: LatLng) => void;
  ref?: Ref<PickerMapHandle>;
};

/** react-native-maps has no web build; the map screen shows its "map unavailable" state instead. */
export const MAPS_AVAILABLE = false;

export function PickerMap(_props: PickerMapProps) {
  return null;
}
