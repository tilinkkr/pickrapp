import { useState } from 'react';
import { Text, type TextStyle, View } from 'react-native';
import Animated, { withTiming } from 'react-native-reanimated';

import { makeStyles } from '@/lib/app-theme';
import { CURVE, DURATION } from '@/lib/motion';

const ROLL = 10;

// Custom entering/exiting worklets: the old value slips up and out, the new one rises into place.
// Timing curves, not springs, so the digits land once and stay put.
function rollIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: ROLL }] },
    animations: {
      opacity: withTiming(1, { duration: DURATION.small, easing: CURVE.decelerate }),
      transform: [{ translateY: withTiming(0, { duration: DURATION.card, easing: CURVE.decelerate }) }],
    },
  };
}
function rollOut() {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
    animations: {
      opacity: withTiming(0, { duration: DURATION.exit, easing: CURVE.accelerate }),
      transform: [{ translateY: withTiming(-ROLL, { duration: DURATION.exit, easing: CURVE.accelerate }) }],
    },
  };
}

/**
 * Odometer-style text: when `value` changes the old text slides up and fades
 * while the new one rises in from below. An invisible copy reserves the
 * width, and tabular figures stop the digits from jittering.
 */
export function RollingText({ value, style }: { value: string; style?: TextStyle }) {
  const styles = useStyles();
  const [first] = useState(value);
  return (
    <View style={styles.box}>
      <Text style={[style, styles.ghost]} aria-hidden>
        {value}
      </Text>
      <Animated.Text key={value} entering={value === first ? undefined : rollIn} exiting={rollOut} style={[style, styles.layer]}>
        {value}
      </Animated.Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  box: {
    overflow: 'hidden',
  },
  ghost: {
    opacity: 0,
    fontVariant: ['tabular-nums'],
  },
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontVariant: ['tabular-nums'],
  },
}));
