/**
 * Kept for the screens and components that already import from here. The
 * tiers live in `HapticsEngine` in `@/theme/motionTokens` — add new ones there.
 *
 * Felt, not heard (2026-11-17): taps and choices share the lightest tick, and
 * a stronger beat is kept for the few results that matter (booking sent,
 * driver found, payment confirmed, an error). Screens moving on by themselves
 * (auto-advance, stage changes, ETA updates) are seen, not felt.
 */
import { HapticsEngine } from '@/theme/motionTokens';

/** Lightest tick: a wheel snapping, a chip or toggle changing. */
export function selectionHaptic() {
  HapticsEngine.tick();
}

/** A small tap, such as opening a sheet. The same light tick as a selection. */
export function tapHaptic() {
  HapticsEngine.tick();
}

/** Choosing a card, chip or tab. */
export function choiceHaptic() {
  HapticsEngine.tick();
}

/** Committing to something weighty, such as sending the booking. */
export function heavyHaptic() {
  HapticsEngine.light();
}

/** A result: booking recorded, driver found, payment confirmed. */
export function successHaptic() {
  HapticsEngine.heavySuccess();
}

export function errorHaptic() {
  HapticsEngine.error();
}
