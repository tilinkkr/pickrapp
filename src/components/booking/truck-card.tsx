import { useEffect } from 'react';
import { Text, View } from 'react-native';
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
import { PressableScale } from '@/components/ui/pressable-scale';
import { Brand } from '@/constants/theme';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { shortVehicleName } from '@/lib/booking-format';
import type { TruckQuote } from '@/lib/catalog';
import { pick } from '@/lib/catalog';
import type { Language } from '@/lib/i18n';
import { MORPH, SPRING_BOUNCY } from '@/lib/motion';
import { formatRupees } from '@/lib/trip-format';

const VEHICLE_TINT: [string, string] = ['#CBD2DA', '#6B7480'];
const FILL_OFF = Brand.surface;
const FILL_ON = '#FFF7ED';

type TruckRowProps = {
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
 * One truck option. Selecting it plays three small beats rather than a swap:
 * the card's fill and border warm up, the truck photo "drives in" (slides
 * forward, levels from a tilt, pops), and the check badge springs in with a
 * quarter-turn.
 */
export function TruckRow({ quote, language, selected, badge, tripsLabel, onPress }: TruckRowProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const { vehicle, range } = quote;
  const on = useSharedValue(selected ? 1 : 0);
  const drive = useSharedValue(1);
  const check = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    on.set(withTiming(selected ? 1 : 0, MORPH));
    check.set(selected ? withSpring(1, SPRING_BOUNCY) : withTiming(0, { duration: 120 }));
    if (selected) drive.set(withSequence(withTiming(0, { duration: 0 }), withSpring(1, SPRING_BOUNCY)));
  }, [selected, on, check, drive]);

  const cardStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [FILL_OFF, FILL_ON]),
    borderColor: interpolateColor(on.value, [0, 1], [FILL_OFF, Brand.primary]),
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
    <PressableScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${vehicle.name}. ${pick(vehicle.capacity, language)}. ${tripsLabel}. ₹${formatRupees(range.low)} to ₹${formatRupees(range.high)}`}>
      <Animated.View style={[styles.row, cardStyle]}>
        <Animated.View style={imageStyle}>
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
          <Text style={styles.price}>₹{formatRupees(range.low)}+</Text>
          <View style={[styles.radio, selected && styles.radioOn]}>
            <Animated.View style={[styles.radioFill, checkStyle]}>
              <Check size={13} color="#FFFFFF" strokeWidth={3.5} />
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </PressableScale>
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
    height: 54,
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
