import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import {
  PickrTruck,
  SPEED_LINE_END_X,
  SPEED_LINE_THICKNESS,
  SPEED_LINES,
  TRUCK_VIEWBOX,
} from '@/components/brand/pickr-truck';
import { Brand } from '@/constants/theme';

import { BACK, IN, OUT, seg, type SplashClocks, T } from './timeline';

type SplashTruckProps = SplashClocks & {
  width: number;
  /** How far left of its resting place the truck starts. */
  enterDistance: number;
  /** How far right it travels when it leaves. */
  exitDistance: number;
};

/** The logo truck: drives in from the left, settles on its suspension, then races off right. */
export function SplashTruck({ width, enterDistance, exitDistance, ...clocks }: SplashTruckProps) {
  const { intro, exit, motion } = clocks;
  const height = (width * TRUCK_VIEWBOX.height) / TRUCK_VIEWBOX.width;

  const style = useAnimatedStyle(() => {
    const t = intro.value;
    const e = exit.value;
    const enter = -(1 - seg(t, T.truckIn, 900, BACK)) * enterDistance;
    const leave = seg(e, 0, 520, IN) * exitDistance;
    // Nose lifts as it accelerates in, dips as it settles, lifts again leaving.
    const tilt = -2 * Math.sin(Math.PI * seg(t, T.truckIn, 700)) - 2.5 * seg(e, 0, 260);
    const bounce = -2 * Math.sin(Math.PI * seg(t, 1050, 380));
    return {
      opacity: motion ? 1 : seg(t, 0, 500),
      transform: [
        { translateX: (enter + leave) * motion },
        { translateY: bounce * motion },
        { rotate: `${tilt * motion}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[{ width, height }, styles.truck, style]}>
      {SPEED_LINES.map((line, i) => (
        <SpeedLine key={line.y} index={i} scale={width / TRUCK_VIEWBOX.width} line={line} {...clocks} />
      ))}
      <View style={StyleSheet.absoluteFill}>
        <PickrTruck width={width} />
      </View>
    </Animated.View>
  );
}

type SpeedLineProps = SplashClocks & {
  index: number;
  scale: number;
  line: (typeof SPEED_LINES)[number];
};

function SpeedLine({ index, scale, line, intro, exit, motion }: SpeedLineProps) {
  const style = useAnimatedStyle(() => {
    const t = intro.value;
    const e = exit.value;
    const grow = seg(t, T.speedLinesIn + index * 40, 650, OUT);
    const stretch = 1 + 1.8 * seg(e, 0, 500, IN);
    return {
      opacity: motion ? 1 : grow,
      transform: [{ scaleX: motion ? grow * stretch : 1 }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.line,
        {
          left: (SPEED_LINE_END_X - line.length) * scale,
          top: line.y * scale,
          width: line.length * scale,
          height: SPEED_LINE_THICKNESS * scale,
          borderRadius: (SPEED_LINE_THICKNESS * scale) / 2,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  truck: {
    transformOrigin: 'bottom',
  },
  line: {
    position: 'absolute',
    backgroundColor: Brand.logoAmber,
    transformOrigin: 'right',
  },
});
