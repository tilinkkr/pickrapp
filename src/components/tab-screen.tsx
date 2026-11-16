import type { PropsWithChildren, ReactNode } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { LIVE_BAR_GAP, LIVE_BAR_HEIGHT } from '@/components/home/active-delivery';
import { TAB_BAR_GAP, TAB_BAR_HEIGHT } from '@/components/navigation/tab-bar';
import { makeStyles } from '@/lib/app-theme';
import { useTrips } from '@/lib/trips';

type TabScreenProps = PropsWithChildren<{
  /** Full-bleed band above the column (e.g. Home's location header); it owns the top inset. */
  header?: ReactNode;
  /** Receives the scroll offset on the UI thread, for scroll-linked UI such as Home's trip bar. */
  scrollY?: SharedValue<number>;
  /** Floating layer drawn above the content (e.g. the live-trip bar over the tab bar). */
  overlay?: ReactNode;
}>;

/** White tab canvas: one centred column on a 24px grid, padded clear of the floating tab bar. */
export function TabScreen({ header, scrollY, overlay, children }: TabScreenProps) {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // The live trip bar sits above the tab bar; keep the last content clear of both.
  const liveBar = useTrips().activeTrip ? LIVE_BAR_HEIGHT + LIVE_BAR_GAP : 0;
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY?.set(event.contentOffset.y);
  });

  return (
    <SafeAreaView style={styles.safe} edges={header ? [] : ['top']}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_GAP + liveBar + 24 }}
        showsVerticalScrollIndicator={false}>
        {header}
        <View style={[styles.scroll, header ? styles.afterHeader : null]}>
          <View style={[styles.column, { maxWidth: width >= 768 ? 720 : 520 }]}>{children}</View>
        </View>
      </Animated.ScrollView>
      {overlay}
    </SafeAreaView>
  );
}

export function ScreenTitle({ children }: PropsWithChildren) {
  const styles = useStyles();
  return (
    <Text style={styles.title} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function SectionLabel({ children }: PropsWithChildren) {
  const styles = useStyles();
  return <Text style={styles.section}>{children}</Text>;
}

const useStyles = makeStyles((Brand) => ({
  safe: {
    flex: 1,
    backgroundColor: Brand.card,
  },
  scroll: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  afterHeader: {
    paddingTop: 16,
  },
  column: {
    width: '100%',
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: Brand.text,
  },
  section: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Brand.text,
  },
}));
