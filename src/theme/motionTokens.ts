import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Easing, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/**
 * One motion vocabulary for the whole app (Swiggy/Zomato/Rapido taxonomy),
 * so every press, card, sheet, radar and price behaves the same way.
 *
 * Rules enforced here:
 * - Doherty Threshold: every perceptible response completes in < 400 ms.
 * - 100–300 ms window: exits 140 ms (accelerate away, never block what is
 *   arriving), entrances 240 ms (decelerate into place), morphs 180 ms.
 * - Sub-animations run on the UI worklet thread via useSharedValue +
 *   useAnimatedStyle; static styles stay in StyleSheet.create so React never
 *   re-renders for motion.
 * - `src/lib/motion.ts` and `src/lib/haptics.ts` re-export from this file;
 *   add new tokens here, never beside them.
 */

/** The ceiling for any interaction response; audit anything slower. */
export const DOHERTY_MAX_MS = 400;

/** Button and card presses: quick and sure, no visible bounce. */
export const SPRING_TACTILE: WithSpringConfig = { damping: 15, stiffness: 300, mass: 0.8 };

/** Bottom sheets and drawers: heavy, settles without oscillation. */
export const SPRING_SHEET: WithSpringConfig = { damping: 22, stiffness: 220, mass: 1.0 };

/** Checkmarks, badges and price pops: quick and settled, no overshoot (calm motion, 2026-11-11). */
export const SPRING_BOUNCY: WithSpringConfig = { damping: 22, stiffness: 260, mass: 0.9 };

/** Screen-to-screen parallax and sheet detent snaps: travel far, land soft. */
export const SPRING_PARALLAX: WithSpringConfig = { damping: 20, stiffness: 180, mass: 1.0 };

/** Outgoing elements: accelerate out of view so they never block the incoming. */
export const EXIT: WithTimingConfig = { duration: 140, easing: Easing.in(Easing.cubic) };

/** Incoming elements: emerge at full speed and decelerate into place. */
export const ENTER: WithTimingConfig = { duration: 240, easing: Easing.out(Easing.cubic) };

/** On-screen morphs: fill, border and opacity changes. */
export const MORPH: WithTimingConfig = { duration: 180, easing: Easing.inOut(Easing.quad) };

/** Reduced-motion fallback: clean cross-fade instead of any translation. */
export const FADE_REDUCED: WithTimingConfig = { duration: 120, easing: Easing.out(Easing.quad) };

/** Stagger between rows that cascade in together (driver match, lists). */
export const STAGGER_MS = 40;

/** Stagger between the dispatch radar's concentric ripple rings. */
export const RADAR_RING_STAGGER_MS = 450;

/** One ripple ring's 0 -> 2.4 scale cycle. */
export const RADAR_RING_CYCLE_MS = 1800;

/** Raw GPS arrives every 3–5 s; the marker glides for this long between fixes. */
export const GPS_GLIDE_MS = 2800;

/** The two-step cancel confirm window on the dispatch sheet. */
export const CANCEL_ARM_MS = 5000;

/** Forward-push parallax: how far and how dim the outgoing screen rests. */
export const PARALLAX = { SHIFT: 0.35, DIM: 0.55 } as const;

/**
 * Haptic tiers by weight of the action (no-op on web; failures are never
 * worth surfacing). Call these from the JS thread, or wrap in runOnJS()
 * inside a gesture/animation worklet.
 */
const hapticsEnabled = Platform.OS !== 'web';

export const HapticsEngine = {
  /** Scrubbing discrete slider steps, filter pills, map zoom thresholds. */
  tick() {
    if (hapticsEnabled) Haptics.selectionAsync().catch(() => {});
  },
  /** Tapping address inputs, toggling helper chips, opening tooltips. */
  light() {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Selecting a truck card, snapping a sheet to a detent. */
  medium() {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  /** Committing to something weighty where a success notification is premature. */
  heavy() {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  /** The 56 pt primary CTA, a driver match, a verified loading PIN. */
  heavySuccess() {
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  error() {
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};
