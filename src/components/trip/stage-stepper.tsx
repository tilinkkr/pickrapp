import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { MIcon, type MIconName } from '@/components/ui/m-icon';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { useSession } from '@/lib/session';
import type { TripStage } from '@/lib/trips';

const STEPS: { stage: TripStage | 'booked'; icon: MIconName; label: 'shortBooked' | 'short_to_pickup' | 'short_loading' | 'short_in_transit' | 'short_unloading' }[] = [
  { stage: 'booked', icon: 'check', label: 'shortBooked' },
  { stage: 'to_pickup', icon: 'truck-fast', label: 'short_to_pickup' },
  { stage: 'loading', icon: 'tray-arrow-up', label: 'short_loading' },
  { stage: 'in_transit', icon: 'map-marker-path', label: 'short_in_transit' },
  { stage: 'unloading', icon: 'tray-arrow-down', label: 'short_unloading' },
];
const DOT = 26;

/**
 * Food-app style order progress: one icon per stage on a line. Finished
 * stages are pale orange, the current one is orange and breathes, the rest
 * wait in grey. The line fills toward the current stage.
 */
export function StageStepper({ stage }: { stage: TripStage }) {
  const styles = useStyles();
  const { t } = useSession();
  const found = STEPS.findIndex((s) => s.stage === stage);
  const current = found === -1 ? STEPS.length : found;
  const fill = useSharedValue(current / (STEPS.length - 1));

  useEffect(() => {
    fill.set(withSpring(Math.min(1, current / (STEPS.length - 1)), { damping: 18, stiffness: 120 }));
  }, [current, fill]);
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));

  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: STEPS.length - 1, now: current }}>
      <View style={styles.track}>
        <Animated.View style={[styles.trackFill, fillStyle]} />
      </View>
      {STEPS.map((step, i) => (
        <Step key={step.stage} icon={step.icon} label={t(step.label)} state={i < current ? 'done' : i === current ? 'now' : 'next'} />
      ))}
    </View>
  );
}

function Step({ icon, label, state }: { icon: MIconName; label: string; state: 'done' | 'now' | 'next' }) {
  const Brand = useBrand();
  const styles = useStyles();
  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.set(state === 'now' ? withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1) : 0);
  }, [state, breathe]);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - breathe.value),
    transform: [{ scale: 1 + breathe.value * 0.6 }],
  }));

  return (
    <View style={styles.step}>
      <View style={styles.dotWrap}>
        {state === 'now' && <Animated.View style={[styles.ring, ringStyle]} />}
        <View style={[styles.dot, state === 'done' && styles.dotDone, state === 'now' && styles.dotNow]}>
          <MIcon name={icon} size={14} color={state === 'next' ? '#A8A29E' : state === 'now' ? Brand.onPrimary : Brand.link} />
        </View>
      </View>
      <Text style={[styles.label, state !== 'next' && styles.labelOn]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  root: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: DOT / 2 - 1.5,
    height: 3,
    borderRadius: 2,
    backgroundColor: Brand.border,
    overflow: 'hidden',
  },
  trackFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Brand.primary,
    transformOrigin: 'left',
  },
  step: {
    width: '20%',
    alignItems: 'center',
    gap: 4,
  },
  dotWrap: {
    width: DOT,
    height: DOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: Brand.primary,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    borderColor: Brand.primary,
    backgroundColor: Brand.selected,
  },
  dotNow: {
    borderColor: Brand.primary,
    backgroundColor: Brand.primary,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: Brand.muted,
  },
  labelOn: {
    color: Brand.text,
    fontWeight: '700',
  },
}));
