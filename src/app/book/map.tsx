import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import Animated, { FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type LatLng, MAPS_AVAILABLE, PICKER_IS_DEMO, PickerMap, type PickerMapHandle } from '@/components/maps/picker-map';
import { PickerPin } from '@/components/maps/picker-pin';
import { EmptyState } from '@/components/trips/empty-state';
import { ChevronLeft, LocateFixed, MapIcon, Minus, Plus } from '@/components/ui/icons';
import { MIcon } from '@/components/ui/m-icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { useBooking } from '@/lib/booking';
import { currentPoint, lookupPlace, type Place, placeLabel } from '@/lib/geocode';
import { selectionHaptic, successHaptic, tapHaptic } from '@/lib/haptics';
import { CURVE, DURATION, enterAt } from '@/lib/motion';
import { AREA_HOME, areaOf, distanceM } from '@/lib/service-area';
import { useSession } from '@/lib/session';
import { type SavedSite, useSites } from '@/lib/sites';

type Purpose = 'pickup' | 'delivery' | 'favourite';
type Gps = 'idle' | 'locating' | 'timeout' | 'denied' | 'blocked';
type Lookup =
  | { state: 'moving' }
  | { state: 'resolving' }
  | { state: 'done'; place: Place | null; reason?: 'permission' | 'empty' | 'failed' };

/** A saved site this close to the pin is offered as "use this instead". */
const SAVED_NEAR_M = 60;
/** The pin barely moved: keep the address already found, no new lookup. */
const SAME_SPOT_M = 12;

/**
 * Full-screen location selection (handoff C05), shared by pickup, delivery
 * and saved sites. The map moves under a fixed centre pin; the pin lifts
 * while it moves and settles with one ring when it stops; the address
 * resolves after the map rests and Confirm waits for it. Outside the service
 * area, while GPS is still locating, or while the map moves, Confirm stays
 * off. GPS never re-centres the map once the customer has moved it, and a
 * lookup answer for an old pin position is thrown away. Closing discards
 * the unfinished selection.
 */
export default function MapPickerScreen() {
  const Brand = useBrand();
  const styles = useStyles();
  const { purpose = 'pickup', siteId } = useLocalSearchParams<{ purpose: Purpose; siteId?: string }>();
  const { favourites, addSite, editSite } = useSites();
  const { t } = useSession();
  const { draft, update } = useBooking();
  const map = useRef<PickerMapHandle>(null);

  const existing =
    purpose === 'favourite'
      ? favourites.find((s) => s.id === siteId)?.coords
      : purpose === 'delivery'
        ? draft.delivery?.coords
        : draft.pickup?.coords;
  const [start] = useState<LatLng>(existing ?? (purpose === 'delivery' ? draft.pickup?.coords : undefined) ?? AREA_HOME);
  const [center, setCenter] = useState<LatLng>(start);
  const [lookup, setLookup] = useState<Lookup>({ state: 'resolving' });
  // A new pickup with no site starts from the customer's GPS (C05); delivery never jumps to it.
  const [gps, setGps] = useState<Gps>(purpose === 'pickup' && !existing ? 'locating' : 'idle');
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState<SavedSite | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);

  const lift = useSharedValue(0);
  const land = useSharedValue(0);
  const request = useRef(0);
  const userMoved = useRef(false);
  const lastFound = useRef<{ point: LatLng; place: Place } | null>(null);
  const snapTo = useRef<SavedSite | null>(null);

  /** Looks the point up; an answer for an older pin position is dropped (C05 stale results). */
  function resolve(point: LatLng) {
    const id = ++request.current;
    const prior = lastFound.current;
    if (prior && distanceM(prior.point, point) < SAME_SPOT_M) {
      Promise.resolve().then(() => {
        if (id === request.current) setLookup({ state: 'done', place: prior.place });
      });
      return;
    }
    lookupPlace(point).then((result) => {
      if (id !== request.current) return;
      if (result.ok) lastFound.current = { point, place: result.place };
      setLookup(result.ok ? { state: 'done', place: result.place } : { state: 'done', place: null, reason: result.reason });
    });
  }

  /** A GPS answer → glide the map there, unless the customer has started moving it themselves. */
  function applyFix(result: Awaited<ReturnType<typeof currentPoint>>) {
    if (userMoved.current) return;
    if (result.ok) {
      setGps('idle');
      map.current?.centerOn(result.point);
    } else {
      setGps(result.reason);
    }
  }

  useEffect(() => {
    resolve(start);
    if (purpose === 'pickup' && !existing) currentPoint().then(applyFix);
    // Run once on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // These three run from the map's own callbacks; they only touch refs, setters and shared values.
  function onMoveStart() {
    request.current += 1;
    setLookup({ state: 'moving' });
    lift.set(withTiming(1, { duration: DURATION.exit, easing: CURVE.decelerate }));
  }

  function onUserGesture() {
    // A drag cancels any "use the saved site" snap that was on its way.
    snapTo.current = null;
    if (userMoved.current) return;
    userMoved.current = true;
    setTouched(true);
    // The customer took over: GPS will not pull the map back (C05).
    setGps((current) => (current === 'locating' ? 'idle' : current));
  }

  function onIdle(point: LatLng) {
    setCenter(point);
    setLookup({ state: 'resolving' });
    lift.set(withTiming(0, { duration: DURATION.small, easing: CURVE.standard }));
    land.set(0);
    land.set(withDelay(DURATION.small - 40, withTiming(1, { duration: 650, easing: CURVE.decelerate })));
    const snap = snapTo.current;
    setSaved(snap?.coords && distanceM(snap.coords, point) < SAME_SPOT_M ? snap : null);
    resolve(point);
  }

  function locateMe() {
    tapHaptic();
    userMoved.current = false;
    setGps('locating');
    currentPoint().then(applyFix);
  }

  function goTo(point: LatLng, site?: SavedSite) {
    selectionHaptic();
    snapTo.current = site ?? null;
    map.current?.centerOn(point);
  }

  async function allowStreetNames() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.granted) {
      lastFound.current = null;
      setLookup({ state: 'resolving' });
      resolve(center);
    } else if (!permission.canAskAgain) {
      Linking.openSettings().catch(() => {});
    }
  }

  const area = areaOf(center);
  const settled = lookup.state === 'done';
  const ready = settled && !!area && gps !== 'locating';
  const place = settled ? lookup.place : null;
  const nearby = !saved ? favourites.find((s) => s.coords && s.id !== siteId && distanceM(s.coords, center) < SAVED_NEAR_M) : undefined;

  function confirm() {
    if (!ready) return;
    successHaptic();
    const label = saved ? saved.label : place ? placeLabel(place) : t('pinnedSpot');
    const coords = saved?.coords ?? center;
    if (purpose === 'favourite') {
      if (siteId) editSite(siteId, { label, coords });
      else addSite({ label, coords });
    } else {
      const site = { label, source: 'map' as const, coords };
      update(purpose === 'delivery' ? { delivery: site } : { pickup: site });
    }
    router.back();
  }

  const title = purpose === 'delivery' ? t('mapDeliveryTitle') : purpose === 'favourite' ? t('mapFavouriteTitle') : t('mapPickupTitle');
  const kind = purpose === 'delivery' ? t('dropPoint') : purpose === 'favourite' ? t('sitePoint') : t('pickupPoint');
  const pinLabel = purpose === 'delivery' ? t('pinDropHere') : purpose === 'favourite' ? t('pinSiteHere') : t('pinPickupHere');
  const confirmLabel = purpose === 'delivery' ? t('confirmDropPoint') : purpose === 'favourite' ? t('saveThisSite') : t('confirmPickupPoint');

  if (!MAPS_AVAILABLE) {
    return (
      <SafeAreaView style={styles.fallback}>
        <EmptyState icon={MapIcon} title={t('mapUnavailable')} body={t('mapUnavailableSub')} />
        <PrimaryButton label={t('back')} onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const status =
    gps === 'locating'
      ? { text: t('gpsFinding'), busy: true }
      : gps === 'timeout'
        ? { text: t('gpsTimeout') }
        : gps === 'denied' || gps === 'blocked'
          ? { text: t('gpsOff'), action: gps === 'blocked' ? t('settingsWord') : t('allowWord') }
          : !touched
            ? { text: t('movePinHint') }
            : null;

  return (
    <View style={styles.root}>
      <PickerMap ref={map} initial={start} onMoveStart={onMoveStart} onUserGesture={onUserGesture} onIdle={onIdle} />
      <PickerPin lift={lift} land={land} label={settled && area ? (saved ? saved.name ?? pinLabel : pinLabel) : undefined} />

      <SafeAreaView edges={['top']} style={styles.top} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('back')} style={styles.round}>
            <ChevronLeft size={26} color={Brand.text} strokeWidth={2} />
          </Pressable>
          <View style={styles.titlePill}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
        {status && (
          <Animated.View key={status.text} entering={enterAt()} exiting={FadeOut.duration(DURATION.exit)} style={styles.statusPill}>
            {status.busy && <ActivityIndicator size="small" color="#FFFFFF" />}
            <Text style={styles.statusText}>{status.text}</Text>
            {status.action && (
              <Pressable
                onPress={() => (gps === 'blocked' ? Linking.openSettings().catch(() => {}) : locateMe())}
                accessibilityRole="button"
                hitSlop={8}>
                <Text style={styles.statusAction}>{status.action}</Text>
              </Pressable>
            )}
          </Animated.View>
        )}
      </SafeAreaView>

      {sheetHeight > 0 && (
        <Animated.View entering={enterAt(0, 120)} style={[styles.controls, { bottom: sheetHeight + 12 }]} pointerEvents="box-none">
          {nearby?.coords && (
            <Animated.View entering={enterAt()} exiting={FadeOut.duration(DURATION.exit)} style={styles.savedChip}>
              <MIcon name="star-outline" size={18} color={Brand.link} />
              <Text style={styles.savedText} numberOfLines={1}>
                {t('savedNearby', { name: nearby.name ?? nearby.label.split(',')[0] })}
              </Text>
              <Pressable onPress={() => goTo(nearby.coords!, nearby)} accessibilityRole="button" hitSlop={8}>
                <Text style={styles.savedUse}>{t('useSaved')}</Text>
              </Pressable>
            </Animated.View>
          )}
          {PICKER_IS_DEMO && !nearby && (
            <View style={styles.demoTag}>
              <Text style={styles.demoText}>{t('demoMap')}</Text>
            </View>
          )}
          <View style={styles.flex} pointerEvents="none" />
          <View style={styles.buttons}>
            <Pressable onPress={() => map.current?.zoomBy(1)} accessibilityRole="button" accessibilityLabel={t('zoomIn')} style={styles.round}>
              <Plus size={22} color={Brand.text} strokeWidth={2.25} />
            </Pressable>
            <Pressable onPress={() => map.current?.zoomBy(-1)} accessibilityRole="button" accessibilityLabel={t('zoomOut')} style={styles.round}>
              <Minus size={22} color={Brand.text} strokeWidth={2.25} />
            </Pressable>
            <Pressable onPress={locateMe} accessibilityRole="button" accessibilityLabel={t('useCurrentLocation')} style={styles.round}>
              {gps === 'locating' ? <ActivityIndicator color={Brand.link} /> : <LocateFixed size={22} color={Brand.link} strokeWidth={2.25} />}
            </Pressable>
          </View>
        </Animated.View>
      )}

      <SafeAreaView edges={['bottom']} style={styles.sheet} onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}>
        <Text style={styles.kind}>{kind}</Text>

        {/* Fixed height, so the sheet never grows or shrinks as the address changes. */}
        <View style={styles.address} accessibilityLiveRegion="polite">
          <View style={styles.addressIcon}>
            <MIcon name="map-marker" size={22} color={Brand.primary} />
          </View>
          {!settled ? (
            <AddressSkeleton label={lookup.state === 'moving' ? undefined : t('findingAddress')} />
          ) : (
            <Animated.View key={saved?.id ?? place?.title ?? lookup.reason ?? 'none'} entering={enterAt()} style={styles.flex}>
              <Text style={styles.placeTitle} numberOfLines={1}>
                {saved ? saved.name ?? saved.label.split(',')[0] : place ? place.title : t('pinnedSpot')}
              </Text>
              {saved || place ? (
                (saved ? saved.label : place?.detail) ? (
                  <Text style={styles.placeDetail} numberOfLines={2}>
                    {saved ? saved.label : place?.detail}
                  </Text>
                ) : null
              ) : lookup.reason === 'permission' ? (
                <Text style={styles.placeDetail} numberOfLines={2}>
                  {t('allowForStreet')}{' '}
                  <Text style={styles.inlineLink} onPress={allowStreetNames} accessibilityRole="link">
                    {t('allowWord')}
                  </Text>
                </Text>
              ) : (
                <Text style={styles.placeDetail} numberOfLines={2}>
                  {PICKER_IS_DEMO ? t('demoStreetNames') : t('noAddressKeepPin')}
                </Text>
              )}
            </Animated.View>
          )}
        </View>

        {/* Rule 1 on the spot: inside or outside the service area, always one line, never hidden. */}
        <View style={[styles.areaRow, !area && settled && styles.areaRowOut]}>
          <MIcon
            name={!settled ? 'map-search-outline' : area ? 'check-circle-outline' : 'alert-circle-outline'}
            size={18}
            color={!settled ? Brand.muted : area ? Brand.success : Brand.danger}
          />
          <Text style={[styles.areaText, settled && !area && styles.areaTextOut]} numberOfLines={2}>
            {!settled ? t('checkingArea') : area ? t('areaInside', { area: area.name }) : t('areaOutside')}
          </Text>
          {settled && !area && (
            <Pressable onPress={() => goTo(AREA_HOME)} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.areaAction}>{t('goToThrissur')}</Text>
            </Pressable>
          )}
        </View>

        <PrimaryButton label={confirmLabel} onPress={confirm} disabled={!ready} />
      </SafeAreaView>
    </View>
  );
}

/** Two quiet bars where the address will be: they hold the space and breathe while the address is looked up. */
function AddressSkeleton({ label }: { label?: string }) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);
  useEffect(() => {
    if (!reduced) glow.set(withRepeat(withTiming(1, { duration: 900, easing: CURVE.standard }), -1, true));
  }, [reduced, glow]);
  const style = useAnimatedStyle(() => ({ opacity: 0.55 + glow.value * 0.45 }));
  return (
    <Animated.View style={[styles.flex, styles.skeleton, style]} accessible={!!label} accessibilityLabel={label}>
      <View style={[styles.bar, styles.barTitle]} />
      <View style={[styles.bar, styles.barDetail]} />
    </Animated.View>
  );
}

const ROUND = 48;

const useStyles = makeStyles((Brand) => ({
  root: {
    flex: 1,
    backgroundColor: '#E8E4DF',
  },
  flex: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: Brand.card,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
  },
  round: {
    width: ROUND,
    height: ROUND,
    borderRadius: ROUND / 2,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  titlePill: {
    flex: 1,
    minHeight: ROUND,
    paddingHorizontal: 16,
    borderRadius: ROUND / 2,
    backgroundColor: Brand.card,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.text,
  },
  statusPill: {
    alignSelf: 'center',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(28, 25, 23, 0.86)',
  },
  statusText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusAction: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FDBA74',
  },
  controls: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  buttons: {
    gap: 10,
  },
  savedChip: {
    flexShrink: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: Brand.card,
    borderWidth: 1,
    borderColor: Brand.primary,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  savedText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Brand.text,
  },
  savedUse: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.link,
  },
  demoTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  demoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#57534E',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Brand.card,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  kind: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Brand.muted,
  },
  address: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    color: Brand.text,
  },
  placeDetail: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 19,
    color: Brand.muted,
  },
  inlineLink: {
    fontWeight: '800',
    color: Brand.link,
  },
  skeleton: {
    paddingTop: 4,
    gap: 10,
  },
  bar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Brand.surface,
  },
  barTitle: {
    width: '55%',
  },
  barDetail: {
    width: '85%',
  },
  areaRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Brand.surface,
  },
  areaRowOut: {
    backgroundColor: Brand.dangerFill,
  },
  areaText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: Brand.text,
  },
  areaTextOut: {
    color: Brand.danger,
  },
  areaAction: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.link,
  },
}));
