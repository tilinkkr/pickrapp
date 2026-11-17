import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { MapArt } from '@/components/maps/map-art';
import { Check, MapPin, ShieldCheck, Truck } from '@/components/ui/icons';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { CURVE, DURATION, popIn } from '@/lib/motion';

/** Nearby trucks, as fractions of the shorter side from the pin and an angle in degrees. */
const TRUCKS = [
  { r: 0.34, a: -30, phase: 0 },
  { r: 0.4, a: 60, phase: 1.7 },
  { r: 0.3, a: 150, phase: 3.1 },
  { r: 0.42, a: 215, phase: 4.4 },
  { r: 0.36, a: 290, phase: 5.6 },
];
const PING_STEP_MS = 1600;
const DRIFT_MS = 14_000;
const RIPPLE_MS = 3200;
const RIPPLE = 240;
const INTRO_MS = 1200;

type SearchMapProps = {
  /** Just placed: a check sits where the pin will be, for a beat. */
  intro?: boolean;
  /** A driver accepted: trucks leave, the pin becomes a verified badge. */
  found?: boolean;
  foundLabel: string;
};

/**
 * Searching hero (C12), ride-app style and calm: the map holds still, two
 * slow rings spread from the pickup pin, and nearby trucks sit almost still
 * on their own small loops, each lighting up in turn as it is contacted.
 * Nothing bobs, pans or orbits (2026-11-17): only opacity and a slow ring.
 * The trucks are illustrative, not real positions.
 */
export function SearchMap({ intro = false, found = false, foundLabel }: SearchMapProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [introDone, setIntroDone] = useState(!intro);
  const drift = useSharedValue(0);
  const ping = useSharedValue(0);
  // Reduced motion: keep the pin and the trucks still; only the status text changes.
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    drift.set(withRepeat(withTiming(1, { duration: DRIFT_MS, easing: Easing.linear }), -1));
    ping.set(withRepeat(withTiming(TRUCKS.length, { duration: PING_STEP_MS * TRUCKS.length, easing: Easing.linear }), -1));
  }, [drift, ping, reduceMotion]);

  useEffect(() => {
    if (!intro) return;
    const timer = setTimeout(() => setIntroDone(true), INTRO_MS);
    return () => clearTimeout(timer);
  }, [intro]);

  const searching = introDone && !found;
  const short = Math.min(size.width, size.height);
  const cx = size.width / 2;
  const cy = size.height * 0.48;

  return (
    <View style={styles.root} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      <MapArt />

      {size.width > 0 && (
        <>
          {searching && !reduceMotion && [0, 1].map((i) => <Ripple key={i} delay={(i * RIPPLE_MS) / 2} cx={cx} cy={cy} />)}

          {searching &&
            TRUCKS.map((truck, i) => {
              const rad = (truck.a * Math.PI) / 180;
              return (
                <TruckMarker
                  key={i}
                  index={i}
                  x={cx + Math.cos(rad) * truck.r * short}
                  y={cy + Math.sin(rad) * truck.r * short}
                  phase={truck.phase}
                  drift={drift}
                  ping={ping}
                />
              );
            })}

          <View style={[styles.center, { left: cx - 40, top: cy - 40 }]} pointerEvents="none">
            {found ? (
              <Animated.View entering={popIn()} style={styles.foundBadge}>
                <ShieldCheck size={38} color={Brand.success} strokeWidth={2.25} fill={Brand.success} fillOpacity={0.25} />
              </Animated.View>
            ) : !introDone ? (
              <Animated.View entering={popIn()} exiting={FadeOut.duration(DURATION.exit)} style={styles.checkBadge}>
                <Check size={36} color={Brand.onPrimary} strokeWidth={3} />
              </Animated.View>
            ) : (
              <Animated.View entering={FadeIn.duration(DURATION.card)} style={styles.pinWrap}>
                <View>
                  <MapPin size={46} color={Brand.link} strokeWidth={1.75} fill={Brand.primary} fillOpacity={1} />
                  <View style={styles.pinDot} />
                </View>
                <View style={styles.pinShadow} />
              </Animated.View>
            )}
          </View>

          {found && (
            <Animated.View entering={FadeIn.delay(160).duration(260)} style={[styles.foundRow, { top: cy + 46 }]} pointerEvents="none">
              <View style={styles.foundChip}>
                <Text style={styles.foundText} accessibilityLiveRegion="polite">
                  {foundLabel}
                </Text>
              </View>
            </Animated.View>
          )}
        </>
      )}
    </View>
  );
}

function Ripple({ delay, cx, cy }: { delay: number; cx: number; cy: number }) {
  const styles = useStyles();
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: RIPPLE_MS, easing: Easing.out(Easing.cubic) }), -1)));
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.4 * (1 - t.value),
    transform: [{ scale: 0.12 + t.value * 0.88 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.ripple, { left: cx - RIPPLE / 2, top: cy - RIPPLE / 2 }, style]} />;
}

function TruckMarker({
  index,
  x,
  y,
  phase,
  drift,
  ping,
}: {
  index: number;
  x: number;
  y: number;
  phase: number;
  drift: SharedValue<number>;
  ping: SharedValue<number>;
}) {
  const Brand = useBrand();
  const styles = useStyles();
  const appear = useSharedValue(0);
  useEffect(() => {
    appear.set(withDelay(300 + index * 120, withTiming(1, { duration: DURATION.page, easing: CURVE.decelerate })));
  }, [appear, index]);

  // Each truck creeps on its own small, slow loop; the one being "contacted" glows.
  const style = useAnimatedStyle(() => {
    const angle = drift.value * Math.PI * 2 + phase;
    return {
      opacity: appear.value,
      transform: [
        { translateX: x - 18 + Math.cos(angle) * 5 },
        { translateY: y - 18 + Math.sin(angle) * 4 },
        { scale: 0.85 + appear.value * 0.15 },
      ],
    };
  });
  const glowStyle = useAnimatedStyle(() => {
    const lit = Math.max(0, 1 - Math.abs(ping.value - index - 0.5) * 2.2);
    return { opacity: lit * 0.9, transform: [{ scale: 1 + lit * 0.4 }] };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.truck, style]}>
      <Animated.View style={[styles.truckGlow, glowStyle]} />
      <View style={styles.truckBody}>
        <Truck size={18} color={Brand.text} strokeWidth={2.25} fill={Brand.primary} fillOpacity={0.8} />
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((Brand) => ({
  root: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: '#EEF0EC',
  },
  ripple: {
    position: 'absolute',
    width: RIPPLE,
    height: RIPPLE,
    borderRadius: RIPPLE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(249, 115, 22, 0.6)',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
  },
  truck: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  truckGlow: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(21, 128, 61, 0.25)',
  },
  truckBody: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  center: {
    position: 'absolute',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinWrap: {
    alignItems: 'center',
  },
  pinDot: {
    position: 'absolute',
    top: 12,
    left: 17,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Brand.card,
  },
  pinShadow: {
    marginTop: 2,
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
    opacity: 0.3,
  },
  checkBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  foundBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#DCFCE7',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  foundChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Brand.primary,
  },
  foundText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.onPrimary,
  },
}));
