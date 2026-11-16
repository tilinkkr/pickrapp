import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { Brand } from '@/constants/theme';

import type { LatLng } from './picker-map';

type TripMapProps = {
  pickup?: LatLng;
  delivery?: LatLng;
  /** Last reported truck position; labelled by the caller when it is a demo value. */
  truck?: LatLng;
  truckLabel: string;
  pickupLabel: string;
  deliveryLabel: string;
};

export const TRIP_MAP_AVAILABLE = true;

/** Sites and truck on one map, framed so both sites stay in view (C14/C16). */
export function TripMap({ pickup, delivery, truck, truckLabel, pickupLabel, deliveryLabel }: TripMapProps) {
  const map = useRef<MapView>(null);
  const points = [pickup, delivery, truck].filter((p): p is LatLng => !!p);

  useEffect(() => {
    if (points.length > 1) {
      map.current?.fitToCoordinates(points, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }
    // Frame once per change of which points exist, not on every truck ping.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length]);

  const first = points[0];
  if (!first) return null;

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      initialRegion={{ ...first, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      toolbarEnabled={false}>
      {pickup && delivery && (
        <Polyline coordinates={[pickup, delivery]} strokeColor={Brand.primary} strokeWidth={4} lineDashPattern={[8, 6]} />
      )}
      {pickup && <Marker coordinate={pickup} title={pickupLabel} pinColor={Brand.success} />}
      {delivery && <Marker coordinate={delivery} title={deliveryLabel} pinColor={Brand.success} />}
      {truck && <Marker coordinate={truck} title={truckLabel} pinColor={Brand.primary} />}
    </MapView>
  );
}
