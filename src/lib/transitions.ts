import { withDelay, withTiming } from 'react-native-reanimated';

import { CURVE, DURATION } from '@/lib/motion';

/**
 * Screen-level transitions, as custom Reanimated worklets. Timing curves, not
 * springs, so nothing overshoots: arrivals use Uber Base's decelerate curve,
 * departures its accelerate curve, and the outgoing page leaves first and
 * faster than the incoming one arrives (Swiggy's choreography rule).
 */
const SHIFT = 32;

/** A stage page arriving: drifts in from the right and fades up, a beat after the old one starts leaving. */
export function pageIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateX: SHIFT }] },
    animations: {
      opacity: withDelay(60, withTiming(1, { duration: DURATION.card, easing: CURVE.decelerate })),
      transform: [{ translateX: withDelay(60, withTiming(0, { duration: DURATION.page, easing: CURVE.decelerate })) }],
    },
  };
}

/** A stage page leaving: slides a little left and fades, fast. */
export function pageOut() {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ translateX: 0 }] },
    animations: {
      opacity: withTiming(0, { duration: DURATION.exit, easing: CURVE.accelerate }),
      transform: [{ translateX: withTiming(-SHIFT * 0.5, { duration: DURATION.exit, easing: CURVE.accelerate }) }],
    },
  };
}

/** A whole screen rising out of the live bar above the tab bar and settling without a bounce. */
export function screenZoomIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 96 }, { scale: 0.92 }] },
    animations: {
      opacity: withTiming(1, { duration: DURATION.small, easing: CURVE.decelerate }),
      transform: [
        { translateY: withTiming(0, { duration: DURATION.sheet, easing: CURVE.decelerate }) },
        { scale: withTiming(1, { duration: DURATION.sheet, easing: CURVE.decelerate }) },
      ],
    },
  };
}

/** Timings for the minimise gesture: the screen shrinks toward the live bar, then the route pops. */
export const MINIMISE_MS = 240;
