import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { ART_SIZE, MapArt } from '@/components/maps/map-art';
import { Truck } from '@/components/ui/icons';
import { makeStyles, useBrand } from '@/lib/app-theme';
import type { Trip } from '@/lib/trips';

type Point = [number, number];

/** The route in map-art space, following its streets: truck's start → pickup → delivery. */
// Kept below y≈90 so nothing sits under the status bar or the back button.
const APPROACH: Point[] = [
  [20, 214],
  [106, 214],
  [106, 160],
];
const DELIVERY: Point[] = [
  [106, 160],
  [106, 100],
  [228, 100],
  [228, 214],
  [300, 214],
];
const ROUTE: Point[] = [...APPROACH, ...DELIVERY.slice(1)];
const GLIDE_MS = 2800;

function length(points: Point[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return total;
}
const APPROACH_SHARE = length(APPROACH) / length(ROUTE);

const pathOf = (points: Point[]) => points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');

/** How far along the whole route the truck is, from the trip's stage and demo ETA/distance. */
function progressOf(trip: Trip) {
  switch (trip.stage) {
    case 'to_pickup': {
      const eta = trip.etaMinutes ?? 12;
      return APPROACH_SHARE * Math.min(1, Math.max(0, 1 - eta / 12));
    }
    case 'loading':
      return APPROACH_SHARE;
    case 'in_transit': {
      const left = trip.distanceKm != null ? Math.min(1, trip.distanceKm / 6.2) : 0.5;
      return APPROACH_SHARE + (1 - APPROACH_SHARE) * (1 - left);
    }
    default:
      return 1;
  }
}

type TrackMapProps = {
  trip: Trip;
  pickupLabel: string;
  deliveryLabel: string;
  etaLabel?: string;
  /** Honest tag such as "Demo map": positions are illustrative (rule 12). */
  note: string;
};

/**
 * Live-trip hero when no real map is available: the route on an illustrated
 * map, and a truck that glides along it between updates instead of jumping.
 * The distance still to drive is drawn bold; the part already driven fades.
 */
export function TrackMap({ trip, pickupLabel, deliveryLabel, etaLabel, note }: TrackMapProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const progress = useSharedValue(progressOf(trip));
  const pulse = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(progressOf(trip), { duration: GLIDE_MS, easing: Easing.inOut(Easing.quad) }));
  }, [trip, progress]);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1));
  }, [pulse]);

  // Map-art coordinates → screen points, matching the art's "slice" scaling.
  const { points, toView } = useMemo(() => {
    const scale = Math.max(size.width / ART_SIZE, size.height / ART_SIZE) || 1;
    const dx = (size.width - ART_SIZE * scale) / 2;
    const dy = (size.height - ART_SIZE * scale) / 2;
    const convert = ([x, y]: Point): Point => [dx + x * scale, dy + y * scale];
    return { points: ROUTE.map(convert), toView: convert };
  }, [size]);

  const cumulative = useMemo(() => {
    const out = [0];
    for (let i = 1; i < points.length; i++) out.push(out[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    return out;
  }, [points]);

  const truckStyle = useAnimatedStyle(() => {
    const total = cumulative[cumulative.length - 1] || 1;
    const target = progress.value * total;
    let i = 1;
    while (i < cumulative.length - 1 && cumulative[i] < target) i++;
    const segment = cumulative[i] - cumulative[i - 1] || 1;
    const f = Math.min(1, Math.max(0, (target - cumulative[i - 1]) / segment));
    const x = points[i - 1][0] + (points[i][0] - points[i - 1][0]) * f;
    const y = points[i - 1][1] + (points[i][1] - points[i - 1][1]) * f;
    return { transform: [{ translateX: x - 22 }, { translateY: y - 22 }] };
  });
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 1.2 }],
  }));

  const pickup = toView(APPROACH[APPROACH.length - 1]);
  const delivery = toView(DELIVERY[DELIVERY.length - 1]);
  const ahead = trip.stage === 'to_pickup' ? ROUTE : DELIVERY;

  return (
    <View style={styles.root} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      <MapArt />
      <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${ART_SIZE} ${ART_SIZE}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
        <Path d={pathOf(ROUTE)} stroke="#FFFFFF" strokeWidth={9} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Path d={pathOf(ROUTE)} stroke="#A8A29E" strokeWidth={4} strokeDasharray="2 7" fill="none" strokeLinecap="round" />
        <Path d={pathOf(ahead)} stroke={Brand.primary} strokeWidth={5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={APPROACH[2][0]} cy={APPROACH[2][1]} r={8} fill={Brand.success} stroke="#FFFFFF" strokeWidth={3.5} />
        <Circle cx={DELIVERY[4][0]} cy={DELIVERY[4][1]} r={8} fill={Brand.primary} stroke="#FFFFFF" strokeWidth={3.5} />
      </Svg>

      {size.width > 0 && (
        <>
          <Label x={pickup[0]} y={pickup[1]} text={pickupLabel} />
          <Label x={delivery[0]} y={delivery[1]} text={deliveryLabel} />
          <Animated.View style={[styles.truck, truckStyle]} pointerEvents="none">
            <Animated.View style={[styles.ring, ringStyle]} />
            <View style={styles.truckBody}>
              <Truck size={22} color={Brand.text} strokeWidth={2.25} fill={Brand.primary} fillOpacity={0.85} />
            </View>
            {etaLabel && (
              <View style={styles.eta}>
                <Text style={styles.etaText} numberOfLines={1}>
                  {etaLabel}
                </Text>
              </View>
            )}
          </Animated.View>
        </>
      )}

      <View style={styles.note}>
        <Text style={styles.noteText}>{note}</Text>
      </View>
    </View>
  );
}

function Label({ x, y, text }: { x: number; y: number; text: string }) {
  const styles = useStyles();
  return (
    <View pointerEvents="none" style={[styles.label, { left: x - 70, top: y + 14 }]}>
      <Text style={styles.labelText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  root: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: '#EEF0EC',
  },
  truck: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(249, 115, 22, 0.35)',
  },
  truckBody: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  eta: {
    position: 'absolute',
    left: 46,
    // Absolute children are measured against the 44 px marker; a fixed width stops "16 min" wrapping.
    width: 58,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Brand.primary,
  },
  etaText: {
    fontSize: 12,
    fontWeight: '800',
    color: Brand.onPrimary,
  },
  label: {
    position: 'absolute',
    width: 140,
    alignItems: 'center',
  },
  labelText: {
    maxWidth: 140,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    fontSize: 12,
    fontWeight: '700',
    color: Brand.text,
  },
  note: {
    position: 'absolute',
    right: 10,
    bottom: 34,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  noteText: {
    fontSize: 11,
    fontWeight: '600',
    color: Brand.muted,
  },
}));
