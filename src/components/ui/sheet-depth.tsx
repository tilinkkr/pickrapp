import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { makeStyles } from '@/lib/app-theme';
import { SPRING_SHEET } from '@/lib/motion';

const SheetDepthContext = createContext<(open: boolean) => void>(() => {});

/**
 * Wraps the app so an open sheet pushes the screen behind it back a step:
 * it shrinks to 96%, drops 8 px and rounds its corners, then springs back
 * when the sheet closes. The customer stays anchored in the page they came
 * from. Reduced motion skips the depth entirely.
 */
export function SheetDepthProvider({ children }: PropsWithChildren) {
  const styles = useStyles();
  const depth = useSharedValue(0);
  const open = useRef(0);
  const reduceMotion = useReducedMotion();

  const setOpen = useCallback(
    (next: boolean) => {
      open.current = Math.max(0, open.current + (next ? 1 : -1));
      if (reduceMotion) return;
      const target = open.current > 0 ? 1 : 0;
      depth.set(target ? withSpring(1, SPRING_SHEET) : withTiming(0, { duration: 220 }));
    },
    [depth, reduceMotion]
  );

  const style = useAnimatedStyle(() => ({
    // Calm motion (2026-11-14): the page behind a sheet stays exactly where it is.
    opacity: 1 - 0 * depth.value,
  }));

  return (
    <SheetDepthContext.Provider value={setOpen}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.page, style]}>{children}</Animated.View>
      </View>
    </SheetDepthContext.Provider>
  );
}

/** Call from any sheet: while `visible`, the page behind it sits back. */
export function useSheetDepth(visible: boolean) {
  const setOpen = useContext(SheetDepthContext);
  useEffect(() => {
    if (!visible) return;
    setOpen(true);
    return () => setOpen(false);
  }, [visible, setOpen]);
}

const useStyles = makeStyles((Brand) => ({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
  page: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: Brand.card,
  },
}));
