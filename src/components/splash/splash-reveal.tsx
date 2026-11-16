import { createContext, type PropsWithChildren, useContext, useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

const STAGGER_MS = 60;
const RISE_PX = 20;

const SplashRevealContext = createContext(true);

/** Tells screens under the splash whether the splash has started handing over to them. */
export function SplashRevealProvider({ revealed, children }: PropsWithChildren<{ revealed: boolean }>) {
  return <SplashRevealContext.Provider value={revealed}>{children}</SplashRevealContext.Provider>;
}

type RevealItemProps = PropsWithChildren<{
  /** Position in the stagger order; each step waits 60 ms longer. */
  index: number;
  style?: StyleProp<ViewStyle>;
}>;

/**
 * Rises into place when the splash hands over. Items that mount after the
 * hand-over render in place immediately.
 */
export function RevealItem({ index, style, children }: RevealItemProps) {
  const revealed = useContext(SplashRevealContext);
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(revealed ? 1 : 0);

  useEffect(() => {
    if (revealed) {
      progress.set(
        withDelay(
          index * STAGGER_MS,
          withSpring(1, { stiffness: 280, damping: 24, overshootClamping: true })
        )
      );
    }
  }, [revealed, index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - progress.value) * RISE_PX }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
