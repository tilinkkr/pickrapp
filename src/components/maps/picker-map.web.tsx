import { type Ref, useImperativeHandle, useMemo } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { MapArt } from '@/components/maps/map-art';
import { CURVE, DURATION } from '@/lib/motion';

export type LatLng = { latitude: number; longitude: number };

export type PickerMapHandle = {
  centerOn: (point: LatLng) => void;
  zoomBy: (delta: number) => void;
};

type PickerMapProps = {
  initial: LatLng;
  onMoveStart: () => void;
  onUserGesture?: () => void;
  onIdle: (point: LatLng) => void;
  ref?: Ref<PickerMapHandle>;
};

/**
 * react-native-maps has no web build, so the web gets an illustrated demo map
 * that pans under the same pin, with the same lift and landing, and is tagged
 * "Demo map" by the screen (rule 12). Positions are worked out from the drag,
 * so the service-area check still runs; street names need the phone app.
 */
export const MAPS_AVAILABLE = true;
export const PICKER_IS_DEMO = true;

/** One repeat of the illustration, in px at zoom 1. */
const TILE = 720;
const TILES = 4;
/** Demo scale: one pixel of drag at zoom 1 moves the pin about a metre. */
const DEG_PER_PX = 0.00001;
const ZOOM_MIN = 0.8;
const ZOOM_MAX = 1.6;

export function PickerMap({ initial, onMoveStart, onUserGesture, onIdle, ref }: PickerMapProps) {
  // Offset of the map in px at zoom 1: right/down moves the map, so the pin lands further west/north.
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const zoom = useSharedValue(1);
  // Where the map was when the finger went down.
  const grabX = useSharedValue(0);
  const grabY = useSharedValue(0);

  const centerOf = (ox: number, oy: number): LatLng => ({
    latitude: initial.latitude + oy * DEG_PER_PX,
    longitude: initial.longitude - ox * DEG_PER_PX,
  });

  useImperativeHandle(ref, () => ({
    centerOn: (point) => {
      onMoveStart();
      const ox = -(point.longitude - initial.longitude) / DEG_PER_PX;
      const oy = (point.latitude - initial.latitude) / DEG_PER_PX;
      const glide = { duration: 450, easing: CURVE.standard };
      x.set(withTiming(ox, glide));
      y.set(
        withTiming(oy, glide, (finished) => {
          if (finished) scheduleOnRN(onIdle, point);
        })
      );
    },
    zoomBy: (delta) => {
      onMoveStart();
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom.get() * 2 ** (delta * 0.5)));
      zoom.set(
        withTiming(next, { duration: DURATION.card, easing: CURVE.standard }, (finished) => {
          if (finished) scheduleOnRN(onIdle, centerOf(x.get(), y.get()));
        })
      );
    },
  }));

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          grabX.set(x.get());
          grabY.set(y.get());
          onUserGesture?.();
          onMoveStart();
        },
        onPanResponderMove: (_, g) => {
          const z = zoom.get();
          x.set(grabX.get() + g.dx / z);
          y.set(grabY.get() + g.dy / z);
        },
        onPanResponderRelease: () => onIdle(centerOf(x.get(), y.get())),
        onPanResponderTerminate: () => onIdle(centerOf(x.get(), y.get())),
      }),
    // The handlers read live shared values; rebuilding them per render is not needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const layer = useAnimatedStyle(() => {
    const span = TILE * zoom.value;
    const wrap = (v: number) => ((((v * zoom.value + span / 2) % span) + span) % span) - span / 2;
    return { transform: [{ translateX: wrap(x.value) }, { translateY: wrap(y.value) }, { scale: zoom.value }] };
  });

  return (
    <View style={styles.root} {...responder.panHandlers}>
      <Animated.View style={[styles.layer, layer]}>
        {Array.from({ length: TILES * TILES }, (_, i) => (
          <View key={i} style={styles.tile}>
            <MapArt />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF0EC',
  },
  layer: {
    width: TILE * TILES,
    height: TILE * TILES,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    width: TILE,
    height: TILE,
  },
});
