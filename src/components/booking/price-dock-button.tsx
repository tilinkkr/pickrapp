import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { ArrowRight } from '@/components/ui/icons';
import { RollingText } from '@/components/ui/rolling-text';
import { makeStyles } from '@/lib/app-theme';
import { successHaptic, tapHaptic } from '@/lib/haptics';
import { SPRING_TACTILE } from '@/lib/motion';

type PriceDockButtonProps = {
  label: string;
  price: string;
  hint?: string;
  onPress: () => void;
};

/**
 * The sticky 56 pt action that carries the price. When the price changes the
 * button gives a small pulse and the figure rolls like an odometer, so the
 * new cost is noticed without reading anything else.
 */
export function PriceDockButton({ label, price, hint, onPress }: PriceDockButtonProps) {
  const styles = useStyles();
  const scale = useSharedValue(1);
  const last = useRef(price);

  useEffect(() => {
    if (last.current === price) return;
    last.current = price;
    scale.set(withSequence(withTiming(1.02, { duration: 90 }), withSpring(1, SPRING_TACTILE)));
  }, [price, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPressIn={() => {
        tapHaptic();
        scale.set(withSpring(0.97, SPRING_TACTILE));
      }}
      onPressOut={() => scale.set(withSpring(1, SPRING_TACTILE))}
      onPress={() => {
        successHaptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${price}`}
      accessibilityHint={hint}>
      <Animated.View style={[styles.button, style]}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.right}>
          <RollingText value={price} style={styles.price} />
          <View style={styles.arrow}>
            <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((Brand) => ({
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
}));
