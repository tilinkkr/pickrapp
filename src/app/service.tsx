import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MIcon, type MIconName } from '@/components/ui/m-icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { SERVICE_COPY, setServiceStatus, useServiceStatus } from '@/lib/service-status';
import { useSession } from '@/lib/session';
import { enterAt } from '@/lib/motion';

/**
 * One page for every "we can't take that booking right now" case (handoff
 * section 8 and C02 paused/no-area variants): no internet, heavy rain, too
 * busy, service down, outside the service area. Each says what happened in
 * one line, what the customer can do, and never blocks existing trips.
 */
export default function ServiceStateScreen() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  const status = useServiceStatus();
  const reduced = useReducedMotion();
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (!reduced) breathe.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduced, breathe]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.25 + breathe.value * 0.35, transform: [{ scale: 1 + breathe.value * 0.12 }] }));

  // Back to normal (the connection returned, the rain passed): leave this page.
  useEffect(() => {
    if (status === 'ok') router.back();
  }, [status]);
  if (status === 'ok') return null;

  const copy = SERVICE_COPY[status];

  function primary() {
    if (status === 'rain') return router.replace('/book/material');
    if (status === 'busy') return router.replace('/book/material');
    if (status === 'out_of_area') return router.back();
    // DEMO retry: the real check re-runs the health request; here it clears the mock state.
    setServiceStatus('ok');
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <Animated.View entering={enterAt()} style={styles.art}>
          <Animated.View style={[styles.halo, halo]} />
          <View style={styles.disc}>
            <MIcon name={copy.icon as MIconName} size={52} color={Brand.onPrimary} />
          </View>
        </Animated.View>
        <Animated.Text entering={enterAt(0, 80)} style={styles.title} accessibilityRole="header">
          {t(copy.title)}
        </Animated.Text>
        <Animated.Text entering={enterAt(0, 140)} style={styles.body}>
          {t(copy.body)}
        </Animated.Text>
      </View>

      <View style={styles.dock}>
        <PrimaryButton label={t(copy.action)} onPress={primary} />
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.secondary}>
          <Text style={styles.secondaryText}>{t('backToHome')}</Text>
        </Pressable>
        <Text style={styles.note}>{t('svcTripsSafe')}</Text>
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((Brand) => ({
  root: {
    flex: 1,
    backgroundColor: Brand.card,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  art: {
    width: 150,
    height: 150,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Brand.primary,
  },
  disc: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: Brand.text,
    textAlign: 'center',
  },
  body: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 23,
    color: Brand.muted,
    textAlign: 'center',
  },
  dock: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 6,
  },
  secondary: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.link,
  },
  note: {
    fontSize: 12,
    color: Brand.muted,
    textAlign: 'center',
  },
}));
