import type { LatLng } from './picker-map';

type TripMapProps = {
  pickup?: LatLng;
  delivery?: LatLng;
  truck?: LatLng;
  truckLabel: string;
  pickupLabel: string;
  deliveryLabel: string;
};

/** react-native-maps has no web build; the trip screen shows its route card instead. */
export const TRIP_MAP_AVAILABLE = false;

export function TripMap(_props: TripMapProps) {
  return null;
}
