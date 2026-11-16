import { type Ref, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView from 'react-native-maps';

export type LatLng = { latitude: number; longitude: number };

export type PickerMapHandle = {
  centerOn: (point: LatLng) => void;
  zoomBy: (delta: number) => void;
};

type PickerMapProps = {
  initial: LatLng;
  /** Fires once when the customer starts moving the map. */
  onMoveStart: () => void;
  /** The point under the centre pin once the map comes to rest. */
  onIdle: (point: LatLng) => void;
  ref?: Ref<PickerMapHandle>;
};

export const MAPS_AVAILABLE = true;

/** Full-bleed map for the fixed-centre-pin picker (handoff C05). Never re-centres on its own. */
export function PickerMap({ initial, onMoveStart, onIdle, ref }: PickerMapProps) {
  const map = useRef<MapView>(null);
  const moving = useRef(false);

  useImperativeHandle(ref, () => ({
    centerOn: (point) => map.current?.animateToRegion({ ...point, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 450),
    zoomBy: (delta) => {
      map.current?.getCamera().then((camera) => {
        map.current?.animateCamera({ zoom: (camera.zoom ?? 15) + delta, altitude: camera.altitude ? camera.altitude / 2 ** delta : undefined }, { duration: 250 });
      });
    },
  }));

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      initialRegion={{ ...initial, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
      showsUserLocation
      showsMyLocationButton={false}
      toolbarEnabled={false}
      onRegionChange={() => {
        if (!moving.current) {
          moving.current = true;
          onMoveStart();
        }
      }}
      onRegionChangeComplete={(region) => {
        moving.current = false;
        onIdle({ latitude: region.latitude, longitude: region.longitude });
      }}
    />
  );
}
