import { useState } from 'react';
import { Text, type TextStyle, View } from 'react-native';
import Animated, { withSpring, withTiming } from 'react-native-reanimated';

import { SPRING_BOUNCY } from '@/lib/motion';
import { makeStyles } from '@/lib/app-theme';

const ROLL = 16;

// Custom entering/exiting worklets: the old value rolls up and out, the new one springs up from below.
function rollIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: ROLL }] },
    animations: { opacity: withTiming(1, { duration: 160 }), transform: [{ translateY: withSpring(0, SPRING_BOUNCY) }] },
  };
}
function rollOut() {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }] },
    animations: { opacity: withTiming(0, { duration: 120 }), transform: [{ translateY: withTiming(-ROLL, { duration: 120 }) }] },
  };
}

/**
 * Odometer-style text: when `value` changes the old text slides up and fades
 * while the new one springs in from below. An invisible copy reserves the
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

const useStyles = makeStyles((Brand) => ({
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
