import * as Haptics from 'expo-haptics';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { TRUCK_VIEWBOX } from '@/components/brand/pickr-truck';
import { Brand } from '@/constants/theme';

import { Bokeh } from './bokeh';
import { SplashTruck } from './splash-truck';
import { SplashWordmark } from './splash-wordmark';
import { INTRO_CLOCK_MS, OUT, seg, type SplashClocks, T } from './timeline';

const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

export type PickrSplashProps = {
  /**
   * True once the brand fonts have settled. Until then the splash shows only
   * the night sky and the native splash stays up.
   */
  canStart: boolean;
  /**
   * True once everything the workspace needs is loaded. The splash holds on the
   * logo (particles keep drifting) until then, so it never reveals a half-loaded screen.
   */
  isReady: boolean;
  /** Called as the cream reveal covers the screen and the workspace starts showing through. */
  onRevealStart?: () => void;
  /** Called after the splash has fully faded; unmount it here. */
  onFinish: () => void;
};

/**
 * The Pickr logo assembles on a night-navy sky: amber bokeh drifts in, the
 * truck drives in trailing its speed lines, PICKR rises letter by letter with
 * an amber glint and HEAVY LOGISTICS spreads out beneath it. When the app is
 * ready the truck races off right and a cream circle opens from where it left
 * into the app.
 */
export function PickrSplash({ canStart, isReady, onRevealStart, onFinish }: PickrSplashProps) {
  // Measured from the splash itself: window dimensions are 0×0 during web
  // server rendering, so they can't size the first frame.
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const started = size !== null && canStart;
  const reduceMotion = useReducedMotion();
  const motion = reduceMotion ? 0 : 1;

  const intro = useSharedValue(0);
  const exit = useSharedValue(0);
  const [holdDone, setHoldDone] = useState(false);
  const exitStarted = useRef(false);

  useEffect(() => {
    if (!started) return;
    // The splash has painted over the native splash, so it can go.
    SplashScreen.hideAsync().catch(() => {});
    intro.set(withTiming(INTRO_CLOCK_MS, { duration: INTRO_CLOCK_MS, easing: Easing.linear }));

    const hapticTimer = setTimeout(() => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    }, T.truckSettled);
    const holdTimer = setTimeout(
      () => setHoldDone(true),
      reduceMotion ? T.reducedHoldUntil : T.holdUntil
    );

    return () => {
      clearTimeout(hapticTimer);
      clearTimeout(holdTimer);
    };
  }, [started, reduceMotion, intro]);

  useEffect(() => {
    if (!holdDone || !isReady || exitStarted.current) return;
    exitStarted.current = true;
    const finish = () => onFinish();
    exit.set(
      withTiming(T.exitTotal, { duration: T.exitTotal, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(finish)();
      })
    );
  }, [holdDone, isReady, onFinish, exit]);

  const revealStart = () => onRevealStart?.();
  useAnimatedReaction(
    () => exit.value >= T.exitHandOver,
    (handedOver, previous) => {
      if (handedOver && !previous) runOnJS(revealStart)();
    }
  );

  useEffect(
    () => () => {
      cancelAnimation(intro);
      cancelAnimation(exit);
    },
    [intro, exit]
  );

  const canvasStyle = useAnimatedStyle(() => ({
    opacity: 1 - seg(exit.value, T.exitHandOver, T.exitTotal - T.exitHandOver),
  }));
  const skyStyle = useAnimatedStyle(() => ({
    opacity: seg(intro.value, T.backgroundIn, 700),
  }));

  const clocks = { intro, exit, motion };

  return (
    <Animated.View
      style={[styles.canvas, canvasStyle]}
      onLayout={(event) => {
        if (size) return;
        const { width, height } = event.nativeEvent.layout;
        if (width && height) setSize({ width, height });
      }}
      accessibilityRole="image"
      accessibilityLabel="Pickr Heavy Logistics">
      <StatusBar style="light" />
      <Animated.View style={[FILL, skyStyle]}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="sky" cx="50%" cy="38%" rx="85%" ry="65%">
              <Stop offset="0" stopColor="#1F3449" />
              <Stop offset="0.55" stopColor={Brand.night} />
              <Stop offset="1" stopColor={Brand.nightDeep} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#sky)" />
        </Svg>
      </Animated.View>

      {size && canStart && <SplashStage width={size.width} height={size.height} {...clocks} />}
    </Animated.View>
  );
}

type SplashStageProps = SplashClocks & { width: number; height: number };

function SplashStage({ width, height, ...clocks }: SplashStageProps) {
  const truckWidth = Math.min(width * 0.66, 300);
  const truckHeight = (truckWidth * TRUCK_VIEWBOX.height) / TRUCK_VIEWBOX.width;
  const wordSize = truckWidth * 0.3;
  const groupHeight = truckHeight + wordSize * 1.12 + wordSize * 0.28 * 1.4;
  const groupTop = height * 0.46 - groupHeight / 2;
  const truckLeft = (width - truckWidth) / 2;
  const truckCenterY = groupTop + truckHeight / 2;

  // The cream circle opens from the right edge where the truck leaves, and
  // grows until it covers the farthest corner.
  const revealRadius = Math.hypot(width, Math.max(truckCenterY, height - truckCenterY));
  const revealStyle = useAnimatedStyle(() => ({
    transform: [{ scale: clocks.motion ? seg(clocks.exit.value, T.exitRevealCircle, 560, OUT) : 0 }],
  }));

  return (
    <>
      <Bokeh
        centerX={width / 2}
        centerY={truckCenterY}
        truckWidth={truckWidth}
        truckHeight={truckHeight}
        {...clocks}
      />
      <Animated.View style={[styles.truck, { left: truckLeft, top: groupTop }]}>
        <SplashTruck
          width={truckWidth}
          enterDistance={truckLeft + truckWidth + 40}
          exitDistance={width - truckLeft + 40}
          {...clocks}
        />
      </Animated.View>
      <Animated.View style={[styles.wordmark, { top: groupTop + truckHeight + 4 }]}>
        <SplashWordmark size={wordSize} {...clocks} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.reveal,
          {
            left: width - revealRadius,
            top: truckCenterY - revealRadius,
            width: revealRadius * 2,
            height: revealRadius * 2,
            borderRadius: revealRadius,
          },
          revealStyle,
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  canvas: {
    ...FILL,
    backgroundColor: Brand.nightDeep,
    overflow: 'hidden',
    zIndex: 1000,
  },
  truck: {
    position: 'absolute',
  },
  wordmark: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  reveal: {
    position: 'absolute',
    backgroundColor: Brand.surface,
  },
});
