import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Check, Truck } from '@/components/ui/icons';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { shortVehicleName } from '@/lib/booking-format';
import { pick, type TruckQuote } from '@/lib/catalog';
import type { Language } from '@/lib/i18n';
import { formatRupees } from '@/lib/trip-format';
import { CURVE, DURATION, MORPH, SPRING_SETTLE, SPRING_TACTILE } from '@/theme/motionTokens';

const VEHICLE_TINT: [string, string] = ['#CBD2DA', '#6B7480'];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_SPRING = SPRING_TACTILE;

type AnimatedTruckCardProps = {
  quote: TruckQuote;
  language: Language;
  selected: boolean;
  /** "Recommended" tag, only on the first quote. */
  badge?: string;
  /** e.g. "1 trip" or "3 trips". */
  tripsLabel: string;
  onPress: () => void;
};

/**
 * One truck option (Tata Ace, 14ft Canter…), built as four explicit
 * sub-animations on the UI worklet thread — never a state-swap:
 *
 * 1. Press physics — onPressIn the card dips to 0.97 on SPRING_TACTILE and
 *    springs back on release.
 * 2. Surface morph — fill and border cross-fade to the selected recipe over
 *    the 180 ms MORPH curve (borderWidth stays constant so nothing re-flows).
 * 3. Truck drive-in — the photo glides forward from -8px, levels from a -4°
 *    tilt and pops 0.92 -> ~1.06 -> 1.0 on SPRING_BOUNCY, as if revving.
 * 4. Check badge — the radio fill springs 0.4 -> 1.0 with a quarter-turn.
 *
 * Photos come from expo-image's memory-disk cache, so a revisit never
 * re-decodes. Prop-compatible with TruckRow for a drop-in swap.
 */
export function AnimatedTruckCard({ quote, language, selected, badge, tripsLabel, onPress }: AnimatedTruckCardProps) {
  const styles = useStyles();
  // From the active palette, so the card is right in dark mode too.
  const palette = useBrand();
  const FILL_OFF = palette.card;
  const FILL_ON = palette.selected;
  const BORDER_OFF = palette.border;
  const BORDER_ON = palette.primary;
  const { vehicle, total } = quote;

  // Sub 1: press physics.
  const press = useSharedValue(1);
  // Sub 2: 0 = resting surface, 1 = selected surface.
  const on = useSharedValue(selected ? 1 : 0);
  // Sub 3: 0 = parked (tilted, back, small), 1 = driven in.
  const drive = useSharedValue(selected ? 1 : 0);
  // Sub 4: 0 = empty radio, 1 = badge seated.
  const check = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    on.set(withTiming(selected ? 1 : 0, MORPH));
    check.set(selected ? withSpring(1, SPRING_SETTLE) : withTiming(0, { duration: 120 }));
    if (selected) {
      // Park instantly behind the curtain, then glide forward into place once (no overshoot).
      drive.set(withSequence(withTiming(0, { duration: 16 }), withTiming(1, { duration: DURATION.page, easing: CURVE.decelerate })));
    } else {
      drive.set(withTiming(0, MORPH));
    }
  }, [selected, on, check, drive]);

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const cardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [FILL_OFF, FILL_ON]),
    borderColor: interpolateColor(on.value, [0, 1], [BORDER_OFF, BORDER_ON]),
  }));
  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -8 * (1 - drive.value) },
      { scale: 0.92 + 0.08 * drive.value },
    ],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: check.value,
    transform: [{ scale: 0.4 + 0.6 * check.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => press.set(1)}
      onPressOut={() => press.set(withSpring(1, PRESS_SPRING))}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${vehicle.name}. ${pick(vehicle.capacity, language)}. ${tripsLabel}. ₹${formatRupees(total)}`}
      style={pressStyle}>
      <Animated.View style={[styles.row, cardStyle]}>
        <Animated.View style={imageStyle}>
          {/* expo-image caches photos in memory and on disk, so a revisit never re-decodes. */}
          <ImagePlaceholder source={vehicle.image} tint={VEHICLE_TINT} icon={Truck} iconSize={20} style={styles.image} />
        </Animated.View>
        <View style={styles.body}>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
          <Text style={styles.name} numberOfLines={1}>
            {shortVehicleName(vehicle.name)}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {pick(vehicle.local, language)} · {tripsLabel}
          </Text>
        </View>
        <View style={styles.end}>
          <Text style={styles.price}>₹{formatRupees(total)}</Text>
          <View style={[styles.radio, selected && styles.radioOn]}>
            <Animated.View style={[styles.radioFill, checkStyle]}>
              <Check size={13} color="#FFFFFF" strokeWidth={3} />
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </AnimatedPressable>
  );
}

const useStyles = makeStyles((Brand) => ({
  row: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
  },
  image: {
    width: 72,
    height: 56,
    borderRadius: 14,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: Brand.text,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: Brand.successFill,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: Brand.success,
  },
  meta: {
    fontSize: 14,
    fontWeight: '500',
    color: Brand.muted,
  },
  end: {
    alignItems: 'flex-end',
    gap: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D6D3D1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: Brand.primary,
  },
  radioFill: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
