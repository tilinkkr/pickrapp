import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Brand } from '@/constants/theme';
import { makeStyles } from '@/lib/app-theme';

const COLORS = [Brand.primary, '#FB923C', '#FDBA74', '#EA580C', '#FED7AA'];
const PIECES = 28;

/** Deterministic spread so every burst looks the same and renders identically on all devices. */
const SPREAD = Array.from({ length: PIECES }, (_, i) => {
  const r = (n: number) => ((Math.sin((i + 1) * n) + 1) / 2);
  return {
    x: r(12.9898) * 2 - 1,
    drift: r(78.233) * 2 - 1,
    delay: r(37.719) * 220,
    spin: (r(4.1) * 2 - 1) * 540,
    size: 7 + r(9.7) * 7,
    color: COLORS[i % COLORS.length],
    round: i % 3 === 0,
  };
});

/** One-shot confetti sweep falling from the top; skipped when the system asks for reduced motion. */
export function Confetti() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {SPREAD.map((piece, i) => (
        <Piece key={i} {...piece} />
      ))}
    </View>
  );
}

function Piece({ x, drift, delay, spin, size, color, round }: (typeof SPREAD)[number]) {
  const styles = useStyles();
  const { width, height } = useWindowDimensions();
  const fall = useSharedValue(0);

  useEffect(() => {
    fall.set(withDelay(delay, withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) })));
  }, [fall, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - Math.max(0, fall.value - 0.7) / 0.3,
    transform: [
      { translateX: width / 2 + x * width * 0.15 + drift * width * 0.4 * fall.value },
      { translateY: -40 + fall.value * height * 0.75 },
      { rotate: `${spin * fall.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        { width: size, height: round ? size : size * 0.45, borderRadius: round ? size / 2 : 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

const useStyles = makeStyles((Brand) => ({
  piece: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
}));
