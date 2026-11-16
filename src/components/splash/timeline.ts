import { Easing, type SharedValue } from 'react-native-reanimated';

/**
 * The splash runs on two clocks measured in milliseconds. `intro` starts when
 * the splash first paints and keeps running while the app finishes loading;
 * `exit` starts once the app is ready. Every layer derives its style from them,
 * so the choreography lives in one place and stays on the UI thread.
 */
export type SplashClocks = {
  intro: SharedValue<number>;
  exit: SharedValue<number>;
  /** 1 for full motion, 0 when the system asks for reduced motion. */
  motion: number;
};

export const T = {
  backgroundIn: 0,
  particlesIn: 200,
  truckIn: 250,
  truckSettled: 1100,
  speedLinesIn: 380,
  wordIn: 950,
  taglineIn: 1350,
  glint: 1850,
  /** Earliest moment the exit may begin. */
  holdUntil: 2400,
  reducedHoldUntil: 1400,
  /** Exit clock. */
  exitRevealCircle: 200,
  exitHandOver: 760,
  exitTotal: 1000,
} as const;

/** The intro clock target; long enough to keep particles moving while the app loads. */
export const INTRO_CLOCK_MS = 60_000;

export const BACK = Easing.out(Easing.back(1.4));
export const OUT = Easing.out(Easing.cubic);
export const IN = Easing.in(Easing.cubic);

/** Progress 0 → 1 of a segment starting at `start` lasting `duration`, optionally eased. */
export function seg(t: number, start: number, duration: number, easing?: (p: number) => number) {
  'worklet';
  const p = Math.min(1, Math.max(0, (t - start) / duration));
  return easing ? easing(p) : p;
}
