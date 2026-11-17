import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Easing, FadeIn, FadeInDown, Keyframe, type WithSpringConfig, type WithTimingConfig, ZoomIn } from 'react-native-reanimated';

/**
 * One motion vocabulary for the whole app, so every card, grid, sheet, pin
 * and price moves the same way.
 *
 * Where the numbers come from (checked 2026-11-17):
 * - Uber Base (uber/baseweb, src/themes/shared/animation.ts): timing tokens
 *   of 100–500 ms, `easeDecelerate` cubic-bezier(0.22, 1, 0.36, 1) for things
 *   arriving, `easeAccelerate` cubic-bezier(0.64, 0, 0.78, 0) for things
 *   leaving, `easeInOutCurve` cubic-bezier(0.4, 0, 0.2, 1) for moves across
 *   the screen.
 * - Uber's map engineering: one owner moves the camera at a time, so the map
 *   never jumps between two targets, and chrome never covers the pickup pin.
 * - Swiggy's motion system: 100–300 ms on mobile, longer for bigger or
 *   farther moves; whatever leaves goes first and fastest, whatever arrives
 *   comes a beat later and slightly slower; children ride on their parent's
 *   motion; ease-out to enter, ease-in to leave, linear for opacity.
 *
 * House rules (2026-11-11, 11-14, 11-17):
 * - Nothing overshoots. Every spring here is critically damped
 *   (`dampingRatio: 1`). Reanimated 4's spring defaults are mass 4 and
 *   stiffness 900, which turn a hand-tuned `damping: 12–18` into a four- or
 *   five-swing wobble: never pass `damping` on its own, and never use
 *   `.springify()` on an entrance. Use the helpers below.
 * - Travel is short: things rise 8 px into place, never Reanimated's 25.
 * - Only opacity and transform move, so nothing re-flows while it animates.
 */

/** Uber Base curves as Reanimated beziers (they also map to CSS on web). */
export const CURVE = {
  /** Base `easeDecelerate`: arriving. Quick start, long soft landing. */
  decelerate: Easing.bezier(0.22, 1, 0.36, 1),
  /** Base `easeAccelerate`: leaving. Starts slow, gets out of the way. */
  accelerate: Easing.bezier(0.64, 0, 0.78, 0),
  /** Base `easeInOutCurve`: something moving from one place on screen to another. */
  standard: Easing.bezier(0.4, 0, 0.2, 1),
} as const;

/** Base timing tokens, named by what they are for. */
export const DURATION = {
  /** Press dims and tiny state flips. */
  instant: 100,
  /** Anything leaving: short, so it never blocks what arrives. */
  exit: 150,
  /** Small things arriving: a chip, a check, one line of text. */
  small: 200,
  /** Cards and grid rows. */
  card: 250,
  /** Page-sized moves: a stage page, the map pin settling. */
  page: 300,
  /** Sheets and full-screen moves. */
  sheet: 400,
} as const;

/** The ceiling for any interaction response; audit anything slower. */
export const DOHERTY_MAX_MS = 400;

/** Stagger between things that arrive together (grid rows, list cards). */
export const STAGGER_MS = 40;

/** How far an arriving card rises: enough to show direction, never a jump. */
export const RISE_PX = 8;

/** Incoming elements: decelerate into place. */
export const ENTER: WithTimingConfig = { duration: DURATION.card, easing: CURVE.decelerate };

/** Outgoing elements: accelerate out of view so they never block the incoming. */
export const EXIT: WithTimingConfig = { duration: DURATION.exit, easing: CURVE.accelerate };

/** On-screen morphs: fill, border and colour changes. */
export const MORPH: WithTimingConfig = { duration: 180, easing: CURVE.standard };

/** Reduced-motion fallback: a clean cross-fade instead of any travel. */
export const FADE_REDUCED: WithTimingConfig = { duration: 120, easing: Easing.linear };

/** Presses and small toggles: quick, settles without a bounce. */
export const SPRING_TACTILE: WithSpringConfig = { duration: 200, dampingRatio: 1 };

/** Bottom sheets and drawers: heavier, still no oscillation. */
export const SPRING_SHEET: WithSpringConfig = { duration: 380, dampingRatio: 1 };

/** Checks, badges and values settling into place. */
export const SPRING_SETTLE: WithSpringConfig = { duration: 280, dampingRatio: 1 };

/** Kept for older imports; it is the same calm settle and no longer bounces. */
export const SPRING_BOUNCY = SPRING_SETTLE;

/** Screen-to-screen moves and sheet detents: travel far, land soft. */
export const SPRING_PARALLAX: WithSpringConfig = { duration: 420, dampingRatio: 1 };

/**
 * On the web, Reanimated pins any custom entrance (one with initial values,
 * or a Keyframe) as an absolutely positioned box of its first measured size
 * once it ends, so the page stops reflowing when content changes. The web
 * therefore gets the stock presets (opacity only), which stay in the normal
 * layout; phones get the full choreography.
 */
const WEB = Platform.OS === 'web';

/**
 * A card arriving in page order: fades in and rises 8 px over 250 ms on the
 * Base decelerate curve, 40 ms after the card before it. For `entering`.
 */
export function enterAt(index = 0, delay = 0) {
  const at = delay + index * STAGGER_MS;
  if (WEB) return FadeIn.duration(DURATION.card).easing(CURVE.decelerate).delay(at);
  return FadeInDown.duration(DURATION.card)
    .easing(CURVE.decelerate)
    .delay(at)
    .withInitialValues({ opacity: 0, transform: [{ translateY: RISE_PX }] });
}

/**
 * Content riding on its parent's entrance (Swiggy's "parenting"): opacity
 * only, linear, the same length as the parent's move. For `entering`.
 */
export function fadeAt(index = 0, delay = 0) {
  return FadeIn.duration(DURATION.card).easing(Easing.linear).delay(delay + index * STAGGER_MS);
}

/**
 * A badge or check appearing: grows from 60 % to full size on the decelerate
 * curve, with no overshoot. For `entering`. Built on the ZoomIn preset (not a
 * Keyframe): on web a Keyframe that animates `scale` never starts and leaves
 * the element hidden.
 */
export function popIn(delay = 0) {
  if (WEB) return FadeIn.duration(DURATION.small).delay(delay);
  return ZoomIn.duration(DURATION.page)
    .easing(CURVE.decelerate)
    .delay(delay)
    .withInitialValues({ transform: [{ scale: 0.6 }] });
}

/**
 * A grid's dividing line ruling itself in from its start edge as the row it
 * belongs to arrives, like lines drawn in a ledger. The view needs
 * `transformOrigin` on the edge it grows from. For `entering`.
 */
export function ruleIn(index = 0, delay = 0, axis: 'x' | 'y' = 'x') {
  if (WEB) return FadeIn.duration(DURATION.page).delay(delay + index * STAGGER_MS);
  const from = axis === 'x' ? { scaleX: 0 } : { scaleY: 0 };
  const to = axis === 'x' ? { scaleX: 1 } : { scaleY: 1 };
  return new Keyframe({
    0: { transform: [from] },
    100: { transform: [to], easing: CURVE.decelerate },
  })
    .duration(DURATION.page)
    .delay(delay + index * STAGGER_MS);
}

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
 * Haptic tiers by weight of the action. Failures are never worth surfacing,
 * and the web has none. Call these from the JS thread, or wrap them in
 * scheduleOnRN() inside a worklet.
 *
 * Android uses the system haptics engine (`performAndroidHapticsAsync`): the
 * same short, crisp clicks as the keyboard and system UI, and it follows the
 * phone's touch-feedback setting. The `impactAsync` and `notificationAsync`
 * calls drive the raw vibration motor on Android, which feels like the phone
 * shaking, so they are only used on iOS (2026-11-17).
 */
const IOS = Platform.OS === 'ios';
const ANDROID = Platform.OS === 'android';

function android(type: Haptics.AndroidHaptics) {
  Haptics.performAndroidHapticsAsync(type).catch(() => {});
}

export const HapticsEngine = {
  /** The lightest tick: a wheel snapping to a value, a chip toggling. */
  tick() {
    if (IOS) Haptics.selectionAsync().catch(() => {});
    else if (ANDROID) android(Haptics.AndroidHaptics.Clock_Tick);
  },
  /** A small, deliberate tap. */
  light() {
    if (IOS) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    else if (ANDROID) android(Haptics.AndroidHaptics.Context_Click);
  },
  /** Committing to something with weight (sending the booking). */
  medium() {
    if (IOS) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    else if (ANDROID) android(Haptics.AndroidHaptics.Virtual_Key);
  },
  /** Kept for older call sites; one step lighter than its name, like the rest. */
  heavy() {
    HapticsEngine.medium();
  },
  /** A result worth feeling: booking recorded, driver found, payment confirmed. */
  heavySuccess() {
    if (IOS) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    else if (ANDROID) android(Haptics.AndroidHaptics.Confirm);
  },
  error() {
    if (IOS) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    else if (ANDROID) android(Haptics.AndroidHaptics.Reject);
  },
};
