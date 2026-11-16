import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { makeStyles, useBrand } from '@/lib/app-theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const W = 360;
const H = 180;
/** Hand-drawn route between the two pins, in the 360×180 drawing space. */
const ROUTE = 'M 70 128 L 70 104 L 132 104 L 150 78 L 214 78 L 230 58 L 290 58';
const ROUTE_LENGTH = 300;

type MockMapProps = {
  pickupLabel: string;
  deliveryLabel: string;
  /** Small honest tag such as "Demo map": this is not a live map. */
  note: string;
  height?: number;
};

/**
 * Illustrated stand-in for a route map until the maps provider is set up:
 * streets, blocks, the two pins with name chips and a route that draws
 * itself in. It is labelled as a demo so nobody reads it as live (rule 12).
 */
export function MockMap({ pickupLabel, deliveryLabel, note, height = H }: MockMapProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const draw = useSharedValue(0);
  useEffect(() => {
    draw.set(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }));
  }, [draw]);
  const routeProps = useAnimatedProps(() => ({ strokeDashoffset: ROUTE_LENGTH * (1 - draw.value) }));

  return (
    <View style={[styles.wrap, { height }]} accessibilityRole="image" accessibilityLabel={`${pickupLabel} → ${deliveryLabel}. ${note}`}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Rect x={0} y={0} width={W} height={H} fill="#EEF0EC" />
        {/* City blocks */}
        <G fill="#E2E6DF">
          <Rect x={10} y={10} width={80} height={60} rx={6} />
          <Rect x={110} y={10} width={90} height={50} rx={6} />
          <Rect x={250} y={80} width={100} height={60} rx={6} />
          <Rect x={100} y={120} width={110} height={50} rx={6} />
          <Rect x={240} y={150} width={60} height={30} rx={6} />
        </G>
        {/* Park and water */}
        <Rect x={300} y={6} width={54} height={36} rx={10} fill="#D5E8CF" />
        <Path d="M 0 160 Q 40 150 60 180 L 0 180 Z" fill="#CFE0EE" />
        {/* Streets */}
        <G stroke="#FFFFFF" strokeLinecap="round" fill="none">
          <Path d="M 0 104 L 360 104" strokeWidth={10} />
          <Path d="M 0 58 L 360 58" strokeWidth={7} />
          <Path d="M 70 0 L 70 180" strokeWidth={7} />
          <Path d="M 230 0 L 230 180" strokeWidth={10} />
          <Path d="M 150 0 L 150 180" strokeWidth={5} />
          <Path d="M 132 104 L 214 0" strokeWidth={5} />
        </G>
        {/* Route: a soft casing, then the line drawing in */}
        <Path d={ROUTE} stroke="#FFFFFF" strokeWidth={9} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <AnimatedPath
          d={ROUTE}
          stroke={Brand.primary}
          strokeWidth={5}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={ROUTE_LENGTH}
          animatedProps={routeProps}
        />
        {/* Pins */}
        <Circle cx={70} cy={128} r={11} fill={Brand.success} stroke="#FFFFFF" strokeWidth={4} />
        <Circle cx={290} cy={58} r={11} fill={Brand.primary} stroke="#FFFFFF" strokeWidth={4} />
      </Svg>

      <View style={[styles.chip, styles.chipPickup]}>
        <Text style={styles.chipText} numberOfLines={1}>
          {pickupLabel}
        </Text>
      </View>
      <View style={[styles.chip, styles.chipDelivery]}>
        <Text style={styles.chipText} numberOfLines={1}>
          {deliveryLabel}
        </Text>
      </View>
      <View style={styles.note}>
        <Text style={styles.noteText}>{note}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  wrap: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#EEF0EC',
  },
  chip: {
    position: 'absolute',
    maxWidth: '46%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
  },
  chipPickup: {
    left: 12,
    bottom: 12,
  },
  chipDelivery: {
    right: 12,
    top: 12,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.text,
  },
  note: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  noteText: {
    fontSize: 11,
    fontWeight: '600',
    color: Brand.muted,
  },
}));
