import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { MIcon } from '@/components/ui/m-icon';
import { useAppTheme } from '@/lib/app-theme';

export type OrbMode = 'idle' | 'speaking' | 'listening' | 'done';

const SIZE = 132;
/** Warm blobs that drift around one another, blurred into a single glow (Siri-like). */
const BLOBS = [
  { color: '#F97316', size: 0.78, radius: 0.16, speed: 1 },
  { color: '#FB923C', size: 0.66, radius: 0.2, speed: -1.4 },
  { color: '#FDBA74', size: 0.58, radius: 0.22, speed: 1.8 },
  { color: '#EA580C', size: 0.5, radius: 0.18, speed: -2.2 },
];

/**
 * The voice agent's presence, after Siri: warm blobs slowly orbit one
 * another under a blur. Idle breathes slowly; speaking glows brighter;
 * listening grows and moves faster; done settles into a check. Only smooth
 * rotation and scale, never a shake or bounce.
 */
export function VoiceOrb({ mode }: { mode: OrbMode }) {
  const { dark } = useAppTheme();
  const reduced = useReducedMotion();
  const spin = useSharedValue(0);
  const breathe = useSharedValue(0);
  const level = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    spin.set(withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1));
    breathe.set(withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduced, spin, breathe]);

  useEffect(() => {
    level.set(withTiming(mode === 'listening' ? 1 : mode === 'speaking' ? 0.6 : mode === 'done' ? 0.2 : 0, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [mode, level]);

  const whole = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + breathe.value * 0.06 + level.value * 0.14 }],
  }));

  return (
    <Animated.View style={[styles.wrap, whole]} aria-hidden>
      {BLOBS.map((blob, i) => (
        <Blob key={i} spin={spin} level={level} {...blob} />
      ))}
      <BlurView intensity={dark ? 25 : 35} tint={dark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, styles.blur]} />
      <View style={styles.center}>
        <MIcon name={mode === 'done' ? 'check' : 'microphone'} size={34} color="#FFFFFF" />
      </View>
    </Animated.View>
  );
}

function Blob({
  spin,
  level,
  color,
  size,
  radius,
  speed,
}: {
  spin: SharedValue<number>;
  level: SharedValue<number>;
  color: string;
  size: number;
  radius: number;
  speed: number;
}) {
  const style = useAnimatedStyle(() => {
    const angle = spin.value * Math.PI * 2 * speed;
    const r = SIZE * radius * (1 + level.value * 0.5);
    return {
      transform: [{ translateX: Math.cos(angle) * r }, { translateY: Math.sin(angle) * r }],
    };
  });
  return (
    <Animated.View
      style={[styles.blob, { width: SIZE * size, height: SIZE * size, borderRadius: (SIZE * size) / 2, backgroundColor: color }, style]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob: {
    position: 'absolute',
    opacity: 0.85,
  },
  blur: {
    borderRadius: SIZE / 2,
    overflow: 'hidden',
  },
  center: {
    width: SIZE * 0.5,
    height: SIZE * 0.5,
    borderRadius: SIZE * 0.25,
    backgroundColor: 'rgba(234, 88, 12, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
