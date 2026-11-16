/**
 * Kept for the screens and components that already import from here. The
 * tiers live in `HapticsEngine` in `@/theme/motionTokens` — add new ones there.
 */
import { HapticsEngine } from '@/theme/motionTokens';

/** Lightest tick: typing digits, toggles, ETA milestones. */
export function selectionHaptic() {
  HapticsEngine.tick();
}

/** Light: small taps such as expanding a list or pulling a seal. */
export function tapHaptic() {
  HapticsEngine.light();
}

/** Medium: selecting a card, chip or tab; a driver being assigned. */
export function choiceHaptic() {
  HapticsEngine.light();
}

/** Heavy: committing to something weighty. */
export function heavyHaptic() {
  HapticsEngine.medium();
}

/** Success: booking recorded, receipt revealed, OTP verified. */
export function successHaptic() {
  HapticsEngine.heavySuccess();
}

export function errorHaptic() {
  HapticsEngine.error();
}
