import { type Ref, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView from 'react-native-maps';

export type LatLng = { latitude: number; longitude: number };

export type PickerMapHandle = {
  /** Glides the map so the point sits under the pin; the zoom stays where the customer left it. */
  centerOn: (point: LatLng) => void;
  zoomBy: (delta: number) => void;
};

type PickerMapProps = {
  initial: LatLng;
  /** Fires once when the map starts moving (finger or code). */
  onMoveStart: () => void;
  /** Fires when the customer's own finger moves the map, so automatic re-centring stops (C05). */
  onUserGesture?: () => void;
  /** The point under the centre pin once the map comes to rest. */
  onIdle: (point: LatLng) => void;
  ref?: Ref<PickerMapHandle>;
};

export const MAPS_AVAILABLE = true;
/** The native map is a real map; the web build draws an illustrated demo instead. */
export const PICKER_IS_DEMO = false;

/** Opening zoom: about 600 m across, close enough to see the gate. */
const DELTA = 0.006;

/**
 * Full-bleed map for the fixed-centre-pin picker (handoff C05). It never
 * re-centres on its own; flat and north-up (no tilt or rotation), so the pin
 * means the same thing at every moment.
 */
export function PickerMap({ initial, onMoveStart, onUserGesture, onIdle, ref }: PickerMapProps) {
  const map = useRef<MapView>(null);
  const moving = useRef(false);

  useImperativeHandle(ref, () => ({
    centerOn: (point) => map.current?.animateCamera({ center: point }, { duration: 450 }),
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
      initialRegion={{ ...initial, latitudeDelta: DELTA, longitudeDelta: DELTA }}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      moveOnMarkerPress={false}
      onPanDrag={onUserGesture}
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
