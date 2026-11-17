import { Text, View } from 'react-native';
import Animated, { FadeOut, type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { makeStyles, useBrand } from '@/lib/app-theme';
import { DURATION, enterAt } from '@/lib/motion';

/** How high the pin lifts while the map moves under it. */
const LIFT_PX = 14;
const HEAD = 36;
const STEM = 16;
/** The overlay is a square centred on the map; the pin's tip sits exactly at its middle. */
const BOX = 240;
const TIP = BOX / 2;
const RING = 64;

type PickerPinProps = {
  /** 0 = resting on the map, 1 = held up while the map moves (animated by the screen). */
  lift: SharedValue<number>;
  /** 0 → 1 once per landing: a single soft ring spreads from the tip. */
  land: SharedValue<number>;
  /** Short line above the pin once it has landed ("Pickup here"); hidden while moving. */
  label?: string;
};

/**
 * The fixed centre pin of the map picker (C05), drawn so its tip, not its
 * middle, marks the point. It moves the way a real pin would, and nothing
 * bounces:
 * 1. map starts moving: the pin lifts 14 px, its shadow shrinks and fades,
 *    and a small dot appears exactly where it will land;
 * 2. map stops: the pin settles back down on the Base standard curve and one
 *    ring spreads from the tip and fades;
 * 3. the label above it fades out on lift and rises back in on landing.
 * Everything is transform or opacity on the UI thread.
 */
export function PickerPin({ lift, land, label }: PickerPinProps) {
  const styles = useStyles();
  const Brand = useBrand();

  const pinStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -LIFT_PX * lift.value }] }));
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 0.3 - 0.16 * lift.value,
    transform: [{ scale: 1 - 0.4 * lift.value }],
  }));
  const markStyle = useAnimatedStyle(() => ({ opacity: lift.value }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: land.value > 0 && land.value < 1 ? 0.5 * (1 - land.value) : 0,
    transform: [{ scale: 0.2 + 1.2 * land.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: 1 - lift.value,
    transform: [{ translateY: -LIFT_PX * lift.value }],
  }));

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={styles.box}>
        <Animated.View style={[styles.ring, { borderColor: Brand.primary }, ringStyle]} />
        <Animated.View style={[styles.shadow, shadowStyle]} />
        <Animated.View style={[styles.mark, markStyle]} />

        <Animated.View style={[styles.pin, pinStyle]}>
          <View style={styles.head}>
            <View style={styles.dot} />
          </View>
          <View style={styles.stem} />
        </Animated.View>

        <Animated.View style={[styles.labelWrap, labelStyle]}>
          {label ? (
            <Animated.View key={label} entering={enterAt(0, 60)} exiting={FadeOut.duration(DURATION.exit)} style={styles.label}>
              <Text style={styles.labelText} numberOfLines={1}>
                {label}
              </Text>
              <View style={styles.caret} />
            </Animated.View>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: BOX,
    height: BOX,
  },
  ring: {
    position: 'absolute',
    left: TIP - RING / 2,
    top: TIP - RING / 2,
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    backgroundColor: 'rgba(249, 115, 22, 0.10)',
  },
  shadow: {
    position: 'absolute',
    left: TIP - 10,
    top: TIP - 3,
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
  },
  mark: {
    position: 'absolute',
    left: TIP - 3,
    top: TIP - 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.text,
  },
  pin: {
    position: 'absolute',
    left: TIP - HEAD / 2,
    top: TIP - HEAD - STEM,
    width: HEAD,
    alignItems: 'center',
  },
  head: {
    width: HEAD,
    height: HEAD,
    borderRadius: HEAD / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  stem: {
    width: 3,
    height: STEM,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: Brand.primary,
  },
  labelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: TIP - HEAD - STEM - 50,
    alignItems: 'center',
  },
  label: {
    maxWidth: BOX,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Brand.card,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.text,
  },
  caret: {
    position: 'absolute',
    bottom: -6,
    width: 12,
    height: 12,
    backgroundColor: Brand.card,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: Brand.border,
    transform: [{ rotate: '45deg' }],
  },
}));
