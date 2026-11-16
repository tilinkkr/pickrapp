import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { makeStyles } from '@/lib/app-theme';

/** Fixed drop positions (x as a fraction of the width, delay, speed) so the shower looks natural but never jumps. */
const DROPS = [
  [0.06, 0, 1300],
  [0.17, 420, 1100],
  [0.28, 160, 1450],
  [0.39, 760, 1200],
  [0.5, 300, 1350],
  [0.61, 900, 1150],
  [0.72, 80, 1400],
  [0.83, 560, 1250],
  [0.94, 240, 1300],
] as const;

/**
 * A light rain shower behind the price when the rain surcharge applies:
 * thin slanted streaks fall and fade on staggered loops. Decorative only;
 * the surcharge is always written out as its own fare line.
 */
export function Rain({ height }: { height: number }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} aria-hidden>
      {DROPS.map(([x, delay, speed], i) => (
        <Drop key={i} x={x} delay={delay} speed={speed} height={height} />
      ))}
    </View>
  );
}

function Drop({ x, delay, speed, height }: { x: number; delay: number; speed: number; height: number }) {
  const styles = useStyles();
  const fall = useSharedValue(0);
  useEffect(() => {
    fall.set(withDelay(delay, withRepeat(withTiming(1, { duration: speed, easing: Easing.in(Easing.quad) }), -1)));
  }, [fall, delay, speed]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - fall.value),
    transform: [{ translateY: -20 + fall.value * (height + 20) }, { translateX: -fall.value * 10 }, { rotate: '12deg' }],
  }));
  return <Animated.View style={[styles.drop, { left: `${x * 100}%` }, style]} />;
}

const useStyles = makeStyles((Brand) => ({
  drop: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 14,
    borderRadius: 1,
    backgroundColor: '#60A5FA',
  },
}));
