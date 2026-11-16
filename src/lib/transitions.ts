import { Easing, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { SPRING_SHEET } from '@/lib/motion';

/**
 * Modern layout transitions, as custom Reanimated worklets.
 *
 * Stage pages use a shared-axis X transition (Material motion): the old page
 * drifts left, shrinks a touch and fades while the new one springs in from
 * the right. Each trip stage reads as its own page, not a growing column.
 */
const SHIFT = 56;

export function pageIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateX: SHIFT }, { scale: 0.96 }] },
    animations: {
      opacity: withDelay(90, withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) })),
      transform: [{ translateX: withDelay(60, withSpring(0, SPRING_SHEET)) }, { scale: withDelay(60, withSpring(1, SPRING_SHEET)) }],
    },
  };
}

export function pageOut() {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ translateX: 0 }, { scale: 1 }] },
    animations: {
      opacity: withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) }),
      transform: [
        { translateX: withTiming(-SHIFT * 0.6, { duration: 200, easing: Easing.in(Easing.quad) }) },
        { scale: withTiming(0.96, { duration: 200 }) },
      ],
    },
  };
}

/** A whole screen zooming up out of the live bar above the tab bar. */
export function screenZoomIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 140 }, { scale: 0.86 }] },
    animations: {
      opacity: withTiming(1, { duration: 200 }),
      transform: [{ translateY: withSpring(0, SPRING_SHEET) }, { scale: withSpring(1, SPRING_SHEET) }],
    },
  };
}

/** Timings for the minimise gesture: the screen shrinks toward the live bar, then the route pops. */
export const MINIMISE_MS = 240;
