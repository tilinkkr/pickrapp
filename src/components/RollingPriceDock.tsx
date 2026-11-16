import { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  ZoomIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ArrowRight, CheckCircle2 } from '@/components/ui/icons';
import { DuoIcon } from '@/components/ui/duo-icon';
import { RollingText } from '@/components/ui/rolling-text';
import { Brand } from '@/constants/theme';
import { HapticsEngine, SPRING_BOUNCY, SPRING_TACTILE } from '@/theme/motionTokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_SPRING = { stiffness: 400, damping: 22 };

/** Docked button phases: resting arrow -> spinning loader -> seated check. */
type DockPhase = 'idle' | 'loading' | 'success';

type RollingPriceDockProps = {
  label: string;
  /** e.g. "₹1,240+". Rolls odometer-style whenever it changes. */
  price: string;
  hint?: string;
  onPress: () => void;
  loading?: boolean;
  /** Morphs the arrow to a check and locks the dock. */
  success?: boolean;
};

/**
 * The sticky 56 pt action that carries the price, as three sub-animations on
 * the UI worklet thread:
 *
 * 1. Tactile pulse — on any price change the dock breathes 1.0 -> 1.02 -> 1.0
 *    (90 ms out, SPRING_TACTILE back), so the new cost is noticed peripherally.
 * 2. Rolling odometer — the price never swaps statically; old digits lift out
 *    (-16px, 120 ms) while the new ones spring up from +16px with tabular
 *    figures, so the width never jitters (delegated to RollingText).
 * 3. Arrow morph — pressing scales the dock to 0.97, the arrow rotates out
 *    (-90°) and fades, and the loader — later the checkmark — springs in
 *    rotating from -90° to 0° (SPRING_BOUNCY) while a radial highlight
 *    expands from the exact touch point.
 */
export function RollingPriceDock({ label, price, hint, onPress, loading = false, success = false }: RollingPriceDockProps) {
  const phase: DockPhase = success ? 'success' : loading ? 'loading' : 'idle';
  const inactive = loading || success;

  // Sub 1: dock pulse whenever the price changes.
  const pulse = useSharedValue(1);
  const lastPrice = useRef(price);
  useEffect(() => {
    if (lastPrice.current === price) return;
    lastPrice.current = price;
    pulse.set(withSequence(withTiming(1.02, { duration: 90, easing: Easing.out(Easing.quad) }), withSpring(1, SPRING_TACTILE)));
  }, [price, pulse]);

  // Sub 3a: press scale on the whole dock.
  const press = useSharedValue(1);
  // Sub 3b: arrow out, morph target in — 0 = arrow seated, 1 = morphed away.
  const morph = useSharedValue(0);

  // Sub 3c: radial burst from the touch point — 0 idle, 1 fully bloomed.
  const burst = useSharedValue(0);
  const burstX = useSharedValue(0);
  const burstY = useSharedValue(0);

  useEffect(() => {
    morph.set(phase === 'idle' ? withTiming(0, { duration: 140 }) : withSpring(1, SPRING_BOUNCY));
  }, [phase, morph]);

  const dockStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value * press.value }] }));
  const arrowStyle = useAnimatedStyle(() => ({
    opacity: 1 - morph.value,
    transform: [{ rotate: `${-90 * morph.value}deg` }, { scale: 1 - 0.25 * morph.value }],
  }));
  const morphStyle = useAnimatedStyle(() => ({
    opacity: morph.value,
    transform: [{ rotate: `${-90 * (1 - morph.value)}deg` }, { scale: 0.6 + 0.4 * morph.value }],
  }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 0.25, 1], [0, 0.3, 0]),
    transform: [{ translateX: burstX.value }, { translateY: burstY.value }, { scale: interpolate(burst.value, [0, 1], [0.15, 22]) }],
  }));

  return (
    <AnimatedPressable
      onPress={() => {
        if (inactive) return;
        HapticsEngine.heavySuccess();
        onPress();
      }}
      onPressIn={(event) => {
        press.set(withSpring(0.97, PRESS_SPRING));
        const { locationX, locationY } = event.nativeEvent;
        if (locationX != null && locationY != null) {
          burstX.set(locationX);
          burstY.set(locationY);
          burst.set(0);
          burst.set(withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }));
        }
      }}
      onPressOut={() => press.set(withSpring(1, PRESS_SPRING))}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${price}`}
      accessibilityHint={hint}
      accessibilityState={{ disabled: inactive, busy: loading }}>
      <Animated.View style={[styles.button, dockStyle]}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.right}>
          <RollingText value={price} style={styles.price} />
          <View style={styles.arrow}>
            {phase === 'success' ? (
              <Animated.View entering={ZoomIn.springify().stiffness(280).damping(18)} style={[styles.morphBox, morphStyle]}>
                <DuoIcon icon={CheckCircle2} fill={Brand.primary} />
              </Animated.View>
            ) : phase === 'loading' ? (
              <Animated.View entering={FadeIn.duration(120)} style={[styles.morphBox, morphStyle]}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </Animated.View>
            ) : (
              <Animated.View style={[styles.morphBox, arrowStyle]}>
                <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
              </Animated.View>
            )}
          </View>
        </View>
        {/* Radial highlight blooms from the touch centre; pure decoration. */}
        <Animated.View pointerEvents="none" accessibilityElementsHidden aria-hidden style={[styles.burst, burstStyle]} />
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingLeft: 20,
    paddingRight: 8,
    borderRadius: 16,
    backgroundColor: Brand.primary,
    overflow: 'hidden',
  },
  label: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '700',
    color: Brand.onPrimary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  price: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.onPrimary,
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Brand.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  morphBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  burst: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
});
