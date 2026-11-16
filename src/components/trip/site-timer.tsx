import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { makeStyles, useBrand } from '@/lib/app-theme';
import { FREE_MINUTES } from '@/lib/fare';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type SiteTimerProps = {
  /** Free seconds left at the site; negative once into extra waiting. */
  secondsLeft: number;
  label: string;
  /** Ring diameter; the clock text scales with it. */
  size?: number;
};

export function clock(seconds: number) {
  const s = Math.abs(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * The 30 free minutes at a site as a ring that empties smoothly second by
 * second. Past zero it turns red and counts the extra waiting up instead
 * (pilot rule: ₹4 or ₹8 a minute).
 */
export function SiteTimer({ secondsLeft, label, size = 96 }: SiteTimerProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const stroke = Math.max(7, Math.round(size * 0.065));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const over = secondsLeft <= 0;
  const share = over ? 1 : Math.min(1, secondsLeft / (FREE_MINUTES * 60));
  const progress = useSharedValue(share);

  useEffect(() => {
    progress.set(withTiming(share, { duration: 950, easing: Easing.linear }));
  }, [share, progress]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - progress.value) }));
  const color = over ? Brand.danger : Brand.primary;

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="timer"
      accessibilityLabel={`${label} ${clock(secondsLeft)}`}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={over ? Brand.dangerFill : Brand.selected} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          animatedProps={ringProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.time, { fontSize: Math.round(size * 0.24) }, over && styles.over]}>
          {over ? '+' : ''}
          {clock(secondsLeft)}
        </Text>
        <Text style={[styles.label, { fontSize: size > 140 ? 13 : 10, maxWidth: size - 24 }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    fontWeight: '800',
    letterSpacing: -1,
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  over: {
    color: Brand.danger,
  },
  label: {
    fontWeight: '700',
    color: Brand.muted,
  },
}));
