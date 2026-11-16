import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOutUp,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  SlideInDown,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

import { MapPin, Phone, Share2, Star, Truck, User, X } from '@/components/ui/icons';
import { useSheetDepth } from '@/components/ui/sheet-depth';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Brand } from '@/constants/theme';
import {
  CANCEL_ARM_MS,
  FADE_REDUCED,
  HapticsEngine,
  RADAR_RING_CYCLE_MS,
  RADAR_RING_STAGGER_MS,
  SPRING_PARALLAX,
} from '@/theme/motionTokens';

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

/** The two sheet detents, as fractions of the viewport (Rapido: 36% while searching). */
const COLLAPSED_FRACTION = 0.36;
const EXPANDED_FRACTION = 0.66;
/** Drag-past thresholds: flick velocity or distance that closes vs snaps a detent. */
const CLOSE_VELOCITY = 900;
const SNAP_VELOCITY = 800;

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** PIN digit pop: springs up from below with a quarter-turn, like the check badge. */
const PinDigitIn = FadeInDown.springify().damping(14).stiffness(260);

export type RadarPhase = 'searching' | 'matched';

export type RadarDriver = {
  name: string;
  phone?: string;
  plate?: string;
  rating?: number;
  verified?: boolean;
};

type DriverRadarProps = {
  visible: boolean;
  phase: RadarPhase;
  /** All copy comes from the caller so this component stays language-agnostic. */
  pickupLabel: string;
  title: string;
  statusLine: string;
  loadLabel?: string;
  priceLabel?: string;
  closeLabel: string;
  cancelLabel: string;
  cancelConfirmLabel: string;
  driverFoundLabel: string;
  pinLabel?: string;
  callLabel: string;
  shareLabel: string;
  trackLabel: string;
  driver?: RadarDriver;
  /** 4-digit start-loading PIN, shown in four tinted boxes after a match. */
  pin?: string;
  onCancel: () => void;
  onClose: () => void;
  onCallDriver: () => void;
  onShareTrack: () => void;
  onTrackTrip: () => void;
};

/**
 * Dispatch radar and matched-driver sheet (Rapido-style), as one overlay:
 *
 * - Radar: three concentric rings ripple out of the pickup pin (scale
 *   0.4 -> 2.4, opacity peaking 0.65) staggered 450 ms apart while the pin
 *   breathes 1.0 <-> 1.08. Runs entirely on the UI thread.
 * - Cancel: a two-step pill — the first tap arms a 5 s drain ring around it
 *   (accidental-tap guard); a second tap inside the window confirms. The
 *   ring is an SVG stroke driven by strokeDashoffset on the worklet thread.
 * - Sheet: two detents (36% / 66%) dragged 1:1 with Gesture.Pan on the UI
 *   thread, snapping on SPRING_PARALLAX with a medium tick per detent; the
 *   page behind it scales to 0.96 via the app's SheetDepthProvider.
 * - Match cascade: rings snap inward, heavySuccess() fires, then rows
 *   stagger in 40 ms apart — driver identity (0 ms), the 4-digit loading PIN
 *   boxes popping left-to-right (40 ms), and the sticky actions (80 ms).
 * - Reduced motion: rings and breathing stop (one static ring), springs
 *   become 120 ms cross-fades, drags still track 1:1.
 */
export function DriverRadarAndTrackingSheet({
  visible,
  phase,
  pickupLabel,
  title,
  statusLine,
  loadLabel,
  priceLabel,
  closeLabel,
  cancelLabel,
  cancelConfirmLabel,
  driverFoundLabel,
  pinLabel,
  callLabel,
  shareLabel,
  trackLabel,
  driver,
  pin,
  onCancel,
  onClose,
  onCallDriver,
  onShareTrack,
  onTrackTrip,
}: DriverRadarProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const collapsed = Math.round(windowHeight * COLLAPSED_FRACTION);
  const expanded = Math.round(windowHeight * EXPANDED_FRACTION);
  const matched = phase === 'matched';

  useSheetDepth(visible);

  function requestClose() {
    onClose();
  }

  // ---- Sheet detents, dragged 1:1 on the UI thread --------------------------
  // The sheet's height is owned by the pan gesture and the match reaction
  // below; it never appears in an effect dependency list, so the compiler
  // lint stays happy and no React re-render ever touches it.
  const sheetH = useSharedValue(matched ? expanded : collapsed);
  // Drag start height; initialised to the same detent without reading sheetH
  // during render (mutating a render-read value is a compiler violation).
  const baseH = useSharedValue(matched ? expanded : collapsed);

  const pan = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onStart(() => {
      'worklet';
      baseH.value = sheetH.value;
      cancelAnimation(sheetH);
    })
    .onUpdate((event) => {
      'worklet';
      sheetH.value = Math.min(expanded, Math.max(collapsed, baseH.value - event.translationY));
    })
    .onEnd((event) => {
      'worklet';
      const flick = event.velocityY;
      const atCollapsed = sheetH.value <= collapsed + 24 && baseH.value <= collapsed + 24;
      if (flick > CLOSE_VELOCITY || (flick > 0 && atCollapsed)) {
        runOnJS(requestClose)();
        return;
      }
      let target = collapsed;
      if (matched) target = event.translationY < 0 || flick < -SNAP_VELOCITY ? expanded : collapsed;
      else if (flick < -SNAP_VELOCITY) target = expanded;
      sheetH.value = withSpring(target, SPRING_PARALLAX);
      if (target !== Math.round(baseH.value)) runOnJS(HapticsEngine.medium)();
    });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: 0.6 }));
  const sheetStyle = useAnimatedStyle(() => ({ height: sheetH.value }));

  // ---- Radar rings -----------------------------------------------------------
  // One loop value per ring; on a match each loop is cancelled and a separate
  // snap value absorbs every ring inward into the pin.
  const ring0 = useSharedValue(0);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const matchSnap = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const rings = [ring0, ring1, ring2];
    if (matched) {
      rings.forEach((ring) => {
        cancelAnimation(ring);
        ring.set(withTiming(1, { duration: 220, easing: Easing.in(Easing.quad) }));
      });
      matchSnap.set(withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
      // The match also rides the sheet up to its expanded detent, on the same
      // spring the pan snap uses — entirely on the UI thread.
      sheetH.set(withSpring(expanded, SPRING_PARALLAX));
    } else {
      matchSnap.set(0);
      sheetH.set(withSpring(collapsed, SPRING_PARALLAX));
      rings.forEach((ring, i) => {
        ring.set(
          withDelay(i * RADAR_RING_STAGGER_MS, withRepeat(withTiming(1, { duration: RADAR_RING_CYCLE_MS, easing: Easing.inOut(Easing.quad) }), -1))
        );
      });
    }
  }, [matched, reduceMotion, expanded, collapsed, ring0, ring1, ring2, matchSnap, sheetH]);

  useEffect(() => {
    if (reduceMotion) return;
    breathe.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [reduceMotion, breathe]);

  const ring0Style = useAnimatedStyle(() => ringTransform(ring0, matchSnap));
  const ring1Style = useAnimatedStyle(() => ringTransform(ring1, matchSnap));
  const ring2Style = useAnimatedStyle(() => ringTransform(ring2, matchSnap));

  const pinBreatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.08 * breathe.value }],
  }));

  // ---- Two-step cancel with a draining SVG ring ------------------------------
  const [armed, setArmed] = useState(false);
  const drain = useSharedValue(0);
  const RING_R = 12;
  const RING_C = 2 * Math.PI * RING_R;

  useEffect(() => {
    if (!armed) {
      drain.set(withTiming(0, { duration: 180 }));
      return;
    }
    drain.set(withTiming(1, { duration: CANCEL_ARM_MS, easing: Easing.linear }));
    const timer = setTimeout(() => setArmed(false), CANCEL_ARM_MS + 60);
    return () => clearTimeout(timer);
  }, [armed, drain]);

  const drainProps = useAnimatedProps(() => ({ strokeDashoffset: RING_C * drain.value }));

  // ---- Match cascade rows (40 ms apart) --------------------------------------
  const rowIn = (row: number) =>
    reduceMotion ? FadeIn.duration(FADE_REDUCED.duration ?? 120) : FadeInDown.springify().damping(16).delay(row * 40);

  const pinDigits = useMemo(() => pin?.split('') ?? [], [pin]);

  if (!visible) return null;

  return (
    <Modal visible transparent statusBarTranslucent onRequestClose={requestClose}>
      {/* RNGH gestures need a root view inside an RN Modal on Android. */}
      <GestureHandlerRootView style={styles.fill}>
        {/* Radar field */}
        <Animated.View style={styles.radar} entering={reduceMotion ? undefined : FadeIn.duration(240)}>
          <View style={styles.ringsAnchor}>
            {reduceMotion ? (
              <View style={[styles.ring, styles.ringStatic]} />
            ) : (
              <>
                <Animated.View style={[styles.ring, ring0Style]} />
                <Animated.View style={[styles.ring, ring1Style]} />
                <Animated.View style={[styles.ring, ring2Style]} />
              </>
            )}
            <Animated.View style={pinBreatheStyle}>
              <View style={styles.pinBadge}>
                <MapPin size={26} color={Brand.night} strokeWidth={2.25} fill={Brand.primary} fillOpacity={0.4} />
                <Truck size={16} color={Brand.primary} strokeWidth={2.25} />
              </View>
            </Animated.View>
          </View>
          <View style={styles.pickupChip}>
            <MapPin size={14} color={Brand.primary} strokeWidth={2.25} />
            <Text style={styles.pickupText} numberOfLines={1}>
              {pickupLabel}
            </Text>
          </View>
        </Animated.View>

        {/* High-contrast floating close: 48 pt container so it survives any terrain. */}
        <Pressable
          onPress={requestClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          hitSlop={8}
          style={styles.floatClose}>
          <X size={22} color={Brand.text} strokeWidth={2.25} />
        </Pressable>

        {/* Backdrop + sheet */}
        <Animated.View
          pointerEvents="none"
          aria-hidden
          entering={reduceMotion ? FadeIn.duration(FADE_REDUCED.duration ?? 120) : FadeIn.duration(200)}
          style={[styles.backdrop, backdropStyle]}
        />
        <GestureDetector gesture={pan}>
          {/* Natural origin: the sheet rises from the bottom (never sideways). */}
          <Animated.View
            style={[styles.sheet, sheetStyle, { paddingBottom: insets.bottom + 12 }]}
            entering={reduceMotion ? FadeIn.duration(FADE_REDUCED.duration ?? 120) : SlideInDown.springify().damping(22).stiffness(220)}
          >
            <View style={styles.grabber} />

            {matched ? (
              // Driver-matched cascade: identity (0 ms) -> PIN (40 ms) -> actions (80 ms).
              <View style={styles.sheetBody}>
                <Text style={styles.matchTitle} accessibilityRole="header">
                  {driverFoundLabel}
                </Text>

                <Animated.View entering={rowIn(0)} style={styles.driverRow}>
                  <View style={styles.avatar}>
                    <User size={26} color={Brand.muted} strokeWidth={1.75} />
                  </View>
                  <View style={styles.driverText}>
                    <Text style={styles.driverName} numberOfLines={1}>
                      {driver?.name}
                    </Text>
                    <View style={styles.ratingRow}>
                      {driver?.rating != null && (
                        <>
                          <Star size={14} color={Brand.primary} strokeWidth={2} fill={Brand.primary} />
                          <Text style={styles.ratingText}>{driver.rating.toFixed(1)}</Text>
                        </>
                      )}
                      {driver?.plate && (
                        <View style={styles.plate}>
                          <Text style={styles.plateText}>{driver.plate}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Animated.View>

                {pin && (
                  <Animated.View entering={rowIn(1)} style={styles.pinRow}>
                    {pinLabel && <Text style={styles.pinLabel}>{pinLabel}</Text>}
                    <View style={styles.pinBoxes}>
                      {pinDigits.map((digit, i) => (
                        <Animated.View
                          key={`${i}-${digit}`}
                          entering={reduceMotion ? FadeIn.duration(120).delay(i * 40) : PinDigitIn.delay(i * 40)}
                          style={[styles.pinBox, i % 2 === 0 ? styles.pinBoxA : styles.pinBoxB]}>
                          <Text style={styles.pinDigit}>{digit}</Text>
                        </Animated.View>
                      ))}
                    </View>
                  </Animated.View>
                )}

                <Animated.View entering={rowIn(2)} style={styles.actions}>
                  <View style={styles.callRow}>
                    <View style={styles.callBtn}>
                      <PrimaryButton
                        label={callLabel}
                        icon={Phone}
                        onPress={() => {
                          HapticsEngine.heavySuccess();
                          onCallDriver();
                        }}
                      />
                    </View>
                    <Pressable
                      onPress={() => {
                        HapticsEngine.light();
                        onShareTrack();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={shareLabel}
                      style={styles.shareBtn}>
                      <Share2 size={22} color={Brand.text} strokeWidth={2.25} />
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => {
                      HapticsEngine.tick();
                      onTrackTrip();
                    }}
                    accessibilityRole="button"
                    style={styles.trackRow}>
                    <Truck size={16} color={Brand.link} strokeWidth={2.25} />
                    <Text style={styles.trackText}>{trackLabel}</Text>
                  </Pressable>
                </Animated.View>
              </View>
            ) : (
              // Searching: status line, load summary, guarded cancel.
              <View style={styles.sheetBody}>
                <Text style={styles.title} accessibilityRole="header">
                  {title}
                </Text>
                <View style={styles.statusBox} accessibilityLiveRegion="polite">
                  <Animated.Text
                    key={statusLine}
                    entering={FadeInDown.duration(320)}
                    exiting={FadeOutUp.duration(200)}
                    style={styles.statusText}
                    numberOfLines={1}>
                    {statusLine}
                  </Animated.Text>
                </View>

                {(loadLabel || priceLabel) && (
                  <View style={styles.loadRow}>
                    <View style={styles.loadIcon}>
                      <Truck size={18} color={Brand.text} strokeWidth={2} />
                    </View>
                    {loadLabel && (
                      <Text style={styles.loadText} numberOfLines={1}>
                        {loadLabel}
                      </Text>
                    )}
                    {priceLabel && <Text style={styles.loadPrice}>{priceLabel}</Text>}
                  </View>
                )}

                <View style={styles.cancelWrap}>
                  <Pressable
                    onPress={() => {
                      if (armed) {
                        HapticsEngine.heavy();
                        setArmed(false);
                        onCancel();
                      } else {
                        HapticsEngine.light();
                        setArmed(true);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={armed ? cancelConfirmLabel : cancelLabel}
                    accessibilityHint={cancelConfirmLabel}
                    style={styles.cancelPill}>
                    <View style={styles.cancelRing}>
                      <Svg width={RING_R * 2 + 6} height={RING_R * 2 + 6}>
                        <AnimatedCircle
                          cx={(RING_R * 2 + 6) / 2}
                          cy={(RING_R * 2 + 6) / 2}
                          r={RING_R}
                          stroke={Brand.danger}
                          strokeWidth={2.5}
                          strokeDasharray={RING_C}
                          fill="none"
                          strokeLinecap="round"
                          animatedProps={drainProps}
                          transform={`rotate(-90 ${(RING_R * 2 + 6) / 2} ${(RING_R * 2 + 6) / 2})`}
                        />
                      </Svg>
                      {armed ? <ActivityIndicator size="small" color={Brand.danger} /> : <X size={16} color={Brand.danger} strokeWidth={2.5} />}
                    </View>
                    <Text style={styles.cancelText} numberOfLines={1}>
                      {armed ? cancelConfirmLabel : cancelLabel}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** Worklet: one ring's ripple, absorbed inward by matchSnap. */
function ringTransform(ring: SharedValue<number>, matchSnap: SharedValue<number>) {
  'worklet';
  const ripple = interpolate(ring.value, [0, 1], [0.4, 2.4]);
  const scale = ripple + (0.15 - ripple) * matchSnap.value;
  const baseOpacity = interpolate(ring.value, [0, 0.15, 1], [0, 0.65, 0]);
  return {
    opacity: baseOpacity * (1 - matchSnap.value),
    transform: [{ scale }],
  };
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: Brand.nightDeep,
  },
  radar: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  ringsAnchor: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Brand.primary,
  },
  ringStatic: {
    opacity: 0.35,
    transform: [{ scale: 1.4 }],
  },
  pinBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Brand.night,
    borderWidth: 2,
    borderColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  pickupChip: {
    maxWidth: '70%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  pickupText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  floatClose: {
    position: 'absolute',
    top: 56,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Brand.card,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(15, 23, 42, 0.35)',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(24, 17, 20, 0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Brand.card,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Brand.border,
    marginTop: 10,
    marginBottom: 6,
  },
  sheetBody: {
    flex: 1,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Brand.text,
  },
  statusBox: {
    height: 24,
    overflow: 'hidden',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '500',
    color: Brand.muted,
  },
  loadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  loadIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Brand.text,
  },
  loadPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  cancelWrap: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  cancelPill: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
  },
  cancelRing: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.danger,
  },
  matchTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Brand.text,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverText: {
    flex: 1,
    gap: 3,
  },
  driverName: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  plate: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  plateText: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Brand.text,
  },
  pinRow: {
    gap: 8,
  },
  pinLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.muted,
  },
  pinBoxes: {
    flexDirection: 'row',
    gap: 10,
  },
  pinBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxA: {
    backgroundColor: Brand.selected,
  },
  pinBoxB: {
    backgroundColor: Brand.warningFill,
  },
  pinDigit: {
    fontSize: 24,
    fontWeight: '800',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    gap: 10,
  },
  callRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  callBtn: {
    flex: 1,
  },
  shareBtn: {
    width: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trackText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.link,
  },
});
