import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { TRIP_MAP_AVAILABLE, TripMap } from '@/components/maps/trip-map';
import { EmptyState } from '@/components/trips/empty-state';
import { CancelSheet } from '@/components/trip/cancel-sheet';
import { DeliveredView } from '@/components/trip/delivered-view';
import { LivePage } from '@/components/trip/live-view';
import { SearchMap } from '@/components/trip/search-map';
import { TrackMap } from '@/components/trip/track-map';
import { ReceiptView } from '@/components/trip/receipt-view';
import { SearchingView } from '@/components/trip/searching-view';
import { SimStrip } from '@/components/trip/sim-strip';
import { TripDetailsSheet } from '@/components/trip/trip-details-sheet';
import { CalendarClock, ChevronDown, CircleX, FileText, Truck } from '@/components/ui/icons';
import { PrimaryButton } from '@/components/ui/primary-button';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { choiceHaptic, errorHaptic, selectionHaptic, successHaptic, tapHaptic } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import { cancelFee } from '@/lib/trip-machine';
import { formatRupees, formatWhen, placeName, useNow } from '@/lib/trip-format';
import { MINIMISE_MS, screenZoomIn } from '@/lib/transitions';
import { type Trip, type TripStage, useTrips } from '@/lib/trips';

const LIVE: TripStage[] = ['to_pickup', 'loading', 'in_transit', 'unloading'];
/** How long the radar shows its "driver found" badge before the map takes over. */
const FOUND_MS = 2500;
/** Share of the screen the map takes in each state. */
const HERO_SHARE: Partial<Record<TripStage, number>> = { searching: 0.58, to_pickup: 0.3, loading: 0.26, in_transit: 0.46, unloading: 0.26 };
/** A light tick as the ETA passes each of these minutes. */
const ETA_MILESTONES = [15, 10, 5];

/**
 * One booking from "placed" to receipt (handoff C11–C20): searching radar,
 * driver found, live progress, delivered with payment due, and the receipt.
 * Searching and live stages split the screen: a visual on top, details below.
 */
export default function TripScreen() {
  const Brand = useBrand();
  const styles = useStyles();
  const { id, placed } = useLocalSearchParams<{ id: string; placed?: string }>();
  const { t, language } = useSession();
  const { trips, dispatch } = useTrips();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const trip = trips.find((x) => x.id === id);
  const lastStage = useRef<TripStage | undefined>(trip?.stage);
  const lastEta = useRef<number | undefined>(trip?.etaMinutes);
  const sheetRef = useAnimatedRef<Animated.ScrollView>();
  const stage = trip?.stage;

  // Each stage is its own page: it opens at its own top, never half-scrolled.
  useEffect(() => {
    sheetRef.current?.scrollTo({ y: 0, animated: true });
  }, [stage, sheetRef]);

  // Minimise: the whole screen shrinks down toward the live bar above the tab bar, then the route closes.
  const shrink = useSharedValue(0);
  const shrinkStyle = useAnimatedStyle(() => ({
    opacity: 1 - shrink.value,
    borderRadius: shrink.value * 32,
    transform: [{ translateY: shrink.value * height * 0.38 }, { scale: 1 - shrink.value * 0.42 }],
  }));
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  // While searching the map takes more room and the sheet sits lower, as in ride apps.
  // The sheet grows and shrinks with what each state needs: mostly map while searching and
  // delivering, mostly sheet when there is something to read (driver, timer, photos).
  const heroHeight = Math.round(height * (HERO_SHARE[trip?.stage ?? 'searching'] ?? 0.44));
  const hero = useSharedValue(heroHeight);
  useEffect(() => {
    hero.set(withTiming(heroHeight, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [heroHeight, hero]);
  const spacerStyle = useAnimatedStyle(() => ({ height: hero.value - 24 }));
  // The sheet slides up over the map; the map drifts up at half speed and dims.
  const heroStyle = useAnimatedStyle(() => ({
    height: hero.value,
    opacity: interpolate(scrollY.value, [0, heroHeight], [1, 0.35], 'clamp'),
    transform: [{ translateY: -scrollY.value * 0.45 }],
  }));
  const compactFrom = heroHeight - insets.top - 96;
  const compactStyle = useAnimatedStyle(() => {
    const shown = interpolate(scrollY.value, [compactFrom, compactFrom + 40], [0, 1], 'clamp');
    return { opacity: shown, transform: [{ translateY: (shown - 1) * 10 }] };
  });

  // ETA milestones are felt, lightly, so a glance at the phone is not needed.
  useEffect(() => {
    const eta = trip?.etaMinutes;
    const previous = lastEta.current;
    lastEta.current = eta;
    if (eta == null || previous == null) return;
    if (ETA_MILESTONES.some((m) => previous > m && eta <= m)) selectionHaptic();
  }, [trip?.etaMinutes]);

  // Haptic beat for each stage change, so progress is felt as well as seen.
  useEffect(() => {
    if (!trip || lastStage.current === trip.stage) return;
    lastStage.current = trip.stage;
    if (trip.stage === 'to_pickup') choiceHaptic();
    else if (trip.stage === 'payment_due' || trip.stage === 'completed') successHaptic();
    else if (trip.stage === 'no_driver') errorHaptic();
    else tapHaptic();
  }, [trip]);

  function goHome() {
    if (router.canDismiss()) router.dismissAll();
    else router.navigate('/');
  }

  function minimise() {
    tapHaptic();
    shrink.set(
      withTiming(1, { duration: MINIMISE_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(goHome);
      })
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.plain}>
        <EmptyState icon={FileText} title={t('notFound')} />
        <PrimaryButton label={t('backToHome')} onPress={goHome} />
      </SafeAreaView>
    );
  }

  const split = trip.stage === 'searching' || LIVE.includes(trip.stage);
  const found = trip.stage === 'to_pickup' && trip.assignedAt != null && now - trip.assignedAt.getTime() < FOUND_MS;
  const price = trip.estimate
    ? `₹${formatRupees(trip.estimate.low)}–${formatRupees(trip.estimate.high)}`
    : trip.amount != null
      ? `₹${formatRupees(trip.amount)}`
      : '';

  // One page per stage, swapped with a shared-axis transition (old slides out left, new springs in from the right).
  const body = (
    <Animated.View key={trip.stage} entering={FadeIn.duration(260)}>
      {trip.stage === 'searching' && trip.releaseReason !== undefined && <Text style={styles.released}>{t('releasedNote')}</Text>}
      {trip.stage === 'searching' && <SearchingView trip={trip} now={now} onCancel={() => setCancelOpen(true)} />}
      {LIVE.includes(trip.stage) && (
        <LivePage trip={trip} now={now} onDetails={() => setDetailsOpen(true)} onCancel={() => setCancelOpen(true)} />
      )}
      {trip.stage === 'payment_due' && <DeliveredView trip={trip} />}
      {trip.stage === 'completed' && <ReceiptView trip={trip} />}
      {trip.stage === 'scheduled' && (
        <Outcome
          icon={CalendarClock}
          title={t('stage_scheduled')}
          body={t('submittedScheduled', { date: formatWhen(language, trip.when) })}
          trip={trip}>
          <PrimaryButton variant="outline" label={t('cancelBooking')} onPress={() => setCancelOpen(true)} />
        </Outcome>
      )}
      {trip.stage === 'no_driver' && (
        <Outcome icon={CircleX} title={t('stage_no_driver')} body={t('noDriverSub')} trip={trip}>
          <PrimaryButton
            label={t('tryAgain')}
            icon={Truck}
            onPress={() => dispatch(trip.id, { type: 'START_SEARCH' })}
          />
          <PrimaryButton variant="outline" label={t('backToHome')} onPress={goHome} />
        </Outcome>
      )}
      {trip.stage === 'cancelled' && (
        <Outcome
          icon={CircleX}
          title={t('cancelledTitle')}
          body={`${trip.cancelReason ?? ''}\n${trip.cancelFee ? t('cancelFeeRecorded', { amount: formatRupees(trip.cancelFee) }) : t('noChargeRecorded')}`}
          trip={trip}>
          <PrimaryButton variant="outline" label={t('backToHome')} onPress={goHome} />
        </Outcome>
      )}
      <SimStrip trip={trip} />
    </Animated.View>
  );

  return (
    <Animated.View entering={screenZoomIn} style={[styles.root, shrinkStyle]}>
      {split ? (
        <>
          <Animated.View style={[styles.hero, heroStyle]}>
            {trip.stage === 'searching' || found ? (
              <SearchMap intro={placed === '1'} found={found} foundLabel={t('driverFound')} />
            ) : TRIP_MAP_AVAILABLE && trip.pickupCoords && trip.deliveryCoords ? (
              <TripMap
                pickup={trip.pickupCoords}
                delivery={trip.deliveryCoords}
                pickupLabel={t('pickupShort')}
                deliveryLabel={t('deliveryShort')}
                truckLabel={trip.simulated ? t('demoPosition') : trip.registration ?? ''}
                truck={truckPosition(trip)}
              />
            ) : (
              <Animated.View entering={FadeIn.duration(500)} style={StyleSheet.absoluteFill}>
                <TrackMap
                  trip={trip}
                  pickupLabel={placeName(trip.pickup)}
                  deliveryLabel={placeName(trip.delivery)}
                  etaLabel={trip.etaMinutes != null && (trip.stage === 'to_pickup' || trip.stage === 'in_transit') ? `${trip.etaMinutes} min` : undefined}
                  note={t('demoMap')}
                />
              </Animated.View>
            )}
          </Animated.View>
          <Animated.ScrollView
            ref={sheetRef}
            onScroll={onScroll}
            scrollEventThrottle={16}
            style={StyleSheet.absoluteFill}
            showsVerticalScrollIndicator={false}>
            <Animated.View style={spacerStyle} />
            <View style={[styles.sheet, { minHeight: height - insets.top - 56 }]}>
              <View style={styles.grabber} />
              <View style={styles.pages}>{body}</View>
            </View>
          </Animated.ScrollView>
          {/* Collapsed context once the map has scrolled away: code, stage and price stay in view. */}
          <Animated.View
            style={[styles.compact, { paddingTop: insets.top + 12 }, compactStyle]}
            pointerEvents="none"
            accessibilityElementsHidden>
            <Text style={styles.compactText} numberOfLines={1}>
              {trip.code} · {t(`short_${trip.stage}` as 'short_loading')}
            </Text>
            <Text style={styles.compactPrice}>{price}</Text>
          </Animated.View>
        </>
      ) : (
        <SafeAreaView edges={['top']} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.plainContent} showsVerticalScrollIndicator={false}>
            {body}
          </ScrollView>
        </SafeAreaView>
      )}

      <SafeAreaView edges={['top']} style={styles.backWrap} pointerEvents="box-none">
        {/* Minimise: the trip keeps running (TripRunner) and Home shows its live summary. */}
        <Pressable onPress={minimise} accessibilityRole="button" accessibilityLabel={t('minimise')} hitSlop={6} style={styles.back}>
          <ChevronDown size={26} color={Brand.text} strokeWidth={2.25} />
        </Pressable>
      </SafeAreaView>


      <CancelSheet
        visible={cancelOpen}
        fee={cancelFee(trip)}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => {
          setCancelOpen(false);
          dispatch(trip.id, { type: 'CANCEL', reason });
        }}
      />

      <TripDetailsSheet trip={trip} visible={detailsOpen} onClose={() => setDetailsOpen(false)} />
    </Animated.View>
  );
}

/** Demo truck dot along the pickup → delivery line while on the delivery leg. */
function truckPosition(trip: Trip) {
  if (!trip.simulated || trip.stage !== 'in_transit' || !trip.pickupCoords || !trip.deliveryCoords) return undefined;
  const done = trip.distanceKm != null ? 1 - Math.min(1, trip.distanceKm / 6.2) : 0.5;
  return {
    latitude: trip.pickupCoords.latitude + (trip.deliveryCoords.latitude - trip.pickupCoords.latitude) * done,
    longitude: trip.pickupCoords.longitude + (trip.deliveryCoords.longitude - trip.pickupCoords.longitude) * done,
  };
}

function Outcome({
  icon: Icon,
  title,
  body,
  trip,
  children,
}: {
  icon: typeof CircleX;
  title: string;
  body: string;
  trip: Trip;
  children: React.ReactNode;
}) {
  const Brand = useBrand();
  const styles = useStyles();
  return (
    <View style={styles.outcome}>
      <Icon size={56} color={Brand.muted} strokeWidth={1.5} />
      <Text style={styles.outcomeTitle} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.outcomeBody}>{body.trim()}</Text>
      <View style={styles.outcomeLoad}>
        <Text style={styles.outcomeLoadMain}>
          {trip.code} · {trip.material} · {trip.quantity}
        </Text>
        <Text style={styles.outcomeLoadRoute}>
          {trip.pickup} → {trip.delivery}
        </Text>
      </View>
      <View style={styles.outcomeActions}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  root: {
    flex: 1,
    backgroundColor: Brand.card,
  },
  flex: {
    flex: 1,
  },
  plain: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: Brand.card,
  },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sheet: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Brand.card,
    shadowColor: '#7C2D12',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  compact: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 72,
    paddingRight: 24,
    paddingBottom: 14,
    backgroundColor: Brand.surface,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  compactText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Brand.text,
  },
  compactPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.link,
  },
  pages: {
    // Pages overlap while one leaves and the next arrives.
    overflow: 'visible',
  },
  released: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Brand.warningFill,
    fontSize: 14,
    fontWeight: '700',
    color: Brand.text,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Brand.border,
    marginBottom: 14,
  },
  plainContent: {
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 40,
  },
  backWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 12,
  },
  back: {
    marginTop: 8,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  outcome: {
    alignItems: 'center',
    gap: 10,
  },
  outcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Brand.text,
    textAlign: 'center',
  },
  outcomeBody: {
    fontSize: 16,
    lineHeight: 23,
    color: Brand.text,
    textAlign: 'center',
  },
  outcomeLoad: {
    alignSelf: 'stretch',
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Brand.surface,
    gap: 4,
  },
  outcomeLoadMain: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.text,
  },
  outcomeLoadRoute: {
    fontSize: 14,
    lineHeight: 20,
    color: Brand.muted,
  },
  outcomeActions: {
    alignSelf: 'stretch',
    marginTop: 12,
    gap: 10,
  },
}));
