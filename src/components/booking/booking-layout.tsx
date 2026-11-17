import { router } from 'expo-router';
import { type PropsWithChildren, type ReactNode, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChevronLeft } from '@/components/ui/icons';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { stepsFor, useBooking } from '@/lib/booking';
import { CURVE } from '@/lib/motion';
import { useSession } from '@/lib/session';

type BookingLayoutProps = PropsWithChildren<{
  title: string;
  /** Sticky bottom dock for the step's one primary action. */
  footer?: ReactNode;
  /** Defaults to going back one step. */
  onBack?: () => void;
  showBack?: boolean;
  /** Booking step (1–6): shows "Step n of 6" and a segmented progress bar. */
  step?: number;
  /** Compact line (load · price) that slides in under the header once the page scrolls. */
  summary?: string;
}>;

const SUMMARY_FROM = 40;
const SUMMARY_TO = 90;

/**
 * A booking step: back arrow + centred title + hairline (as in the reference
 * design), one scrolling column, and the action pinned in the thumb zone.
 */
export function BookingLayout({ title, footer, onBack, showBack = true, step, summary, children }: BookingLayoutProps) {
  // Six steps when the material needs a transit pass, five otherwise.
  const total = stepsFor(useBooking().draft.itemId);
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  const { width } = useWindowDimensions();
  const maxWidth = width >= 768 ? 720 : 560;
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  const summaryStyle = useAnimatedStyle(() => {
    const shown = interpolate(scrollY.value, [SUMMARY_FROM, SUMMARY_TO], [0, 1], 'clamp');
    return { opacity: shown, transform: [{ translateY: (shown - 1) * 12 }] };
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {showBack ? (
          <Pressable
            onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
            hitSlop={8}
            style={styles.back}>
            <ChevronLeft size={30} color={Brand.text} strokeWidth={2} />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        <Text style={[styles.title, step != null && styles.titleLeft]} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {step != null ? (
          <Text style={styles.stepText}>{t('stepOf', { n: step, total })}</Text>
        ) : (
          <View style={styles.back} />
        )}
      </View>
      {step != null && <StepProgress step={step} total={total} />}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.flex}>
          <Animated.ScrollView
            onScroll={summary ? onScroll : undefined}
            scrollEventThrottle={16}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={[styles.column, { maxWidth }]}>{children}</View>
          </Animated.ScrollView>
          {summary && (
            <Animated.View style={[styles.summary, summaryStyle]} pointerEvents="none" accessibilityElementsHidden>
              <Text style={styles.summaryText} numberOfLines={1}>
                {summary}
              </Text>
            </Animated.View>
          )}
        </View>
        {footer && (
          <View style={styles.footer}>
            <View style={[styles.column, { maxWidth }]}>{footer}</View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Six segments; earlier ones are full and the current one fills in on arrival. */
function StepProgress({ step, total }: { step: number; total: number }) {
  const styles = useStyles();
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(withTiming(1, { duration: 450, easing: CURVE.decelerate }));
  }, [fill]);
  const currentStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));

  return (
    <View
      style={styles.progress}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: step }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={styles.segment}>
          {i < step - 1 && <View style={styles.segmentFill} />}
          {i === step - 1 && <Animated.View style={[styles.segmentFill, currentStyle]} />}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  safe: {
    flex: 1,
    backgroundColor: Brand.card,
  },
  flex: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  back: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleLeft: {
    textAlign: 'left',
    paddingLeft: 4,
  },
  stepText: {
    paddingRight: 8,
    fontSize: 15,
    fontWeight: '600',
    color: Brand.muted,
  },
  progress: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 4,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: Brand.border,
    overflow: 'hidden',
  },
  segmentFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 3,
    backgroundColor: Brand.primary,
    transformOrigin: 'left',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '700',
    color: Brand.text,
  },
  scroll: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  column: {
    width: '100%',
  },
  summary: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Brand.surface,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.text,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: Brand.card,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
  },
}));
