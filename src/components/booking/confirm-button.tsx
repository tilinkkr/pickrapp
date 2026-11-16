import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { CheckCircle2, Send } from '@/components/ui/icons';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { heavyHaptic, successHaptic, tapHaptic } from '@/lib/haptics';

const PRESS_SPRING = { damping: 15, stiffness: 300 };
const CHECK_SPRING = { damping: 12, stiffness: 220 };
const RING_MS = 500;
/** Pause on the finished check before moving on, so the change is seen. */
const HOLD_MS = 650;

type ConfirmButtonProps = {
  label: string;
  busyLabel: string;
  doneLabel: string;
  /** Price and load shown on a second line inside the button, so the cost is known before tapping. */
  price?: string;
  disabled?: boolean;
  /** Does the real work; resolves when the booking is recorded. Throwing keeps the button usable. */
  onConfirm: () => Promise<void>;
  /** Called after the confirmation beat; navigate here. */
  onDone: () => void;
};

/**
 * The final booking action, built from separate sub-animations rather than
 * one swap:
 * 1. press-in: 0.97 spring and a light tick;
 * 2. busy: the button greys and shows a spinner at once (under 400 ms);
 * 3. recorded: the send arrow turns 180° and shrinks away while a check
 *    springs in from 0.4;
 * 4. a soft ring, the button's own shape, swells out and fades;
 * 5. the status line slides up 8 px into place, with a success haptic.
 */
export function ConfirmButton({ label, busyLabel, doneLabel, price, disabled, onConfirm, onDone }: ConfirmButtonProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const press = useSharedValue(1);
  const morph = useSharedValue(0);
  const check = useSharedValue(0);
  const ring = useSharedValue(0);
  const status = useSharedValue(1);

  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const arrowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morph.value, [0, 0.5], [1, 0], 'clamp'),
    transform: [{ rotate: `${morph.value * 180}deg` }, { scale: interpolate(morph.value, [0, 1], [1, 0], 'clamp') }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(check.value, [0, 0.3], [0, 1], 'clamp'),
    transform: [{ scale: 0.4 + check.value * 0.6 }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - ring.value),
    transform: [{ scaleX: 1 + ring.value * 0.12 }, { scaleY: 1 + ring.value * 1.2 }],
  }));
  const statusStyle = useAnimatedStyle(() => ({
    opacity: status.value,
    transform: [{ translateY: (1 - status.value) * 8 }],
  }));

  // After the ring settles, hold briefly on the finished check, then move on.
  const finish = () => setTimeout(onDone, HOLD_MS - RING_MS);

  function restartStatus() {
    status.set(0);
    status.set(withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
  }

  async function onPress() {
    if (state !== 'idle' || disabled) return;
    heavyHaptic();
    setState('busy');
    restartStatus();
    try {
      await onConfirm();
    } catch {
      setState('idle');
      restartStatus();
      return;
    }
    setState('done');
    restartStatus();
    successHaptic();
    morph.set(withTiming(1, { duration: 280, easing: Easing.in(Easing.quad) }));
    check.set(withDelay(140, withSpring(1, CHECK_SPRING)));
    ring.set(
      withTiming(1, { duration: RING_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(finish);
      })
    );
  }

  const busy = state === 'busy';

  return (
    <View>
      <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />
      <Pressable
        onPressIn={() => {
          if (state !== 'idle' || disabled) return;
          tapHaptic();
          press.set(1);
        }}
        onPressOut={() => press.set(withSpring(1, PRESS_SPRING))}
        onPress={onPress}
        disabled={disabled || state !== 'idle'}
        accessibilityRole="button"
        accessibilityLabel={price ? `${label}, ${price}` : label}
        accessibilityState={{ disabled, busy }}>
        <Animated.View style={[styles.button, busy && styles.busy, disabled && styles.disabled, buttonStyle]}>
          <View style={styles.icon}>
            {busy ? (
              <ActivityIndicator color={Brand.onPrimary} />
            ) : (
              <>
                <Animated.View style={[styles.iconLayer, arrowStyle]}>
                  <Send size={22} color={Brand.onPrimary} strokeWidth={2.25} />
                </Animated.View>
                <Animated.View style={[styles.iconLayer, checkStyle]}>
                  <CheckCircle2 size={24} color={Brand.onPrimary} strokeWidth={2.5} />
                </Animated.View>
              </>
            )}
          </View>
          <Animated.View style={[styles.text, statusStyle]}>
            <Text style={styles.label} numberOfLines={2}>
              {busy ? busyLabel : state === 'done' ? doneLabel : label}
            </Text>
            {price && state === 'idle' && (
              <Text style={styles.price} numberOfLines={1}>
                {price}
              </Text>
            )}
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  ring: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
    backgroundColor: Brand.selected,
  },
  button: {
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: Brand.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  busy: {
    backgroundColor: '#FDBA74',
  },
  disabled: {
    opacity: 0.4,
  },
  icon: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    position: 'absolute',
  },
  text: {
    flexShrink: 1,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.onPrimary,
  },
  price: {
    marginTop: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Brand.onPrimary,
    opacity: 0.85,
  },
}));
