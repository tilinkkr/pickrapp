import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_GAP, TAB_BAR_HEIGHT } from '@/components/navigation/tab-bar';
import { clock } from '@/components/trip/site-timer';
import { ChevronRight } from '@/components/ui/icons';
import { IconChip, STAGE_ICON } from '@/components/ui/m-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { makeStyles, useAppTheme, useBrand } from '@/lib/app-theme';
import { freeSecondsLeft } from '@/lib/fare';
import { enterAt } from '@/lib/motion';
import { useSession } from '@/lib/session';
import { placeName, useNow } from '@/lib/trip-format';
import { type Trip, useTrips } from '@/lib/trips';

/** Height of the live bar; tab screens add it to their bottom padding while a trip is active. */
export const LIVE_BAR_HEIGHT = 60;
export const LIVE_BAR_GAP = 10;

type Status = { big: string; small: string; over: boolean };

/**
 * The one number that matters now, live: minutes to go while moving, the
 * free-time countdown at a site (counting up in red once it runs out),
 * otherwise the stage name.
 */
function useStatus(trip: Trip): Status {
  const { t } = useSession();
  const atSite = trip.stage === 'loading' || trip.stage === 'unloading';
  const now = useNow(atSite ? 1000 : 15_000);
  const place = placeName(trip.stage === 'to_pickup' || trip.stage === 'loading' ? trip.pickup : trip.delivery);
  const left = atSite ? freeSecondsLeft(trip, now) : null;
  if (left !== null) {
    const over = left <= 0;
    return { big: `${over ? '+' : ''}${clock(left)}`, small: `${t(over ? 'overtimeNow' : 'freeTimeLeft')} · ${place}`, over };
  }
  if (trip.etaMinutes != null && (trip.stage === 'to_pickup' || trip.stage === 'in_transit')) {
    return { big: `${trip.etaMinutes} ${t('minUnit')}`, small: `${t(`short_${trip.stage}` as 'short_loading')} · ${place}`, over: false };
  }
  return { big: t(`short_${trip.stage}` as 'short_loading'), small: `${trip.code} · ${trip.material}`, over: false };
}

/**
 * The live trip, parked just above the tab bar on every tab (Swiggy/Zomato
 * order bar). Minimising the trip screen shrinks it into this bar; tapping
 * the bar zooms the trip back up. Frosted glass, one icon, one number.
 */
export function LiveTripBar() {
  const { activeTrip } = useTrips();
  if (!activeTrip) return null;
  // Keyed by trip so a new trip zooms in fresh.
  return <Bar key={activeTrip.id} trip={activeTrip} />;
}

function Bar({ trip }: { trip: Trip }) {
  const Brand = useBrand();
  const styles = useStyles();
  const { dark } = useAppTheme();
  const { t } = useSession();
  const insets = useSafeAreaInsets();
  const status = useStatus(trip);
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!reduced) pulse.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1));
  }, [reduced, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 0.5 }] }));

  return (
    <Animated.View
      entering={enterAt(0, 120)}
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_GAP + LIVE_BAR_GAP }]}>
      <PressableScale
        onPress={() => router.push({ pathname: '/trip/[id]', params: { id: trip.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${t('activeDelivery')}. ${status.small}. ${status.big}`}
        style={styles.bar}>
        <BlurView intensity={50} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.fill]} />
        <View style={styles.iconWrap}>
          <Animated.View style={[styles.pulse, ring]} />
          <IconChip name={STAGE_ICON[trip.stage]} size={40} tone="solid" />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.big, status.over && styles.over]} numberOfLines={1}>
            {status.big}
          </Text>
          <Text style={styles.small} numberOfLines={1}>
            {status.small}
          </Text>
        </View>
        <ChevronRight size={20} color={Brand.link} strokeWidth={2.5} />
      </PressableScale>
    </Animated.View>
  );
}

const useStyles = makeStyles((Brand) => ({
  flex: {
    flex: 1,
  },
  wrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    maxWidth: 340,
    height: LIVE_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Brand.primary,
    overflow: 'hidden',
    shadowColor: '#7C2D12',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  fill: {
    backgroundColor: Brand.card === '#FFFFFF' ? 'rgba(255, 247, 237, 0.86)' : 'rgba(41, 37, 36, 0.86)',
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: Brand.primary,
  },
  big: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  over: {
    color: Brand.danger,
  },
  small: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.muted,
  },
}));
