import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type LatLng, MAPS_AVAILABLE, PickerMap, type PickerMapHandle } from '@/components/maps/picker-map';
import { EmptyState } from '@/components/trips/empty-state';
import { ChevronLeft, LocateFixed, MapIcon, MapPin, Minus, Plus } from '@/components/ui/icons';
import { PrimaryButton } from '@/components/ui/primary-button';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { useBooking } from '@/lib/booking';
import { successHaptic, tapHaptic } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import { useSites } from '@/lib/sites';

/** Thrissur town centre: where the map opens when there is no site and no GPS. */
const FALLBACK: LatLng = { latitude: 10.5276, longitude: 76.2144 };

/**
 * Full-screen location selection (handoff C05), shared by pickup and delivery.
 * The pin stays in the middle; the address resolves after the map stops, and
 * Confirm waits for it. Closing discards the unfinished selection.
 */
export default function MapPickerScreen() {
  const Brand = useBrand();
  const styles = useStyles();
  // 'favourite' saves the pinned place to Favourites (a new site, or `siteId` to move an existing one).
  const { purpose, siteId } = useLocalSearchParams<{ purpose: 'pickup' | 'delivery' | 'favourite'; siteId?: string }>();
  const { favourites, addSite, editSite } = useSites();
  const { t } = useSession();
  const { draft, update } = useBooking();
  const map = useRef<PickerMapHandle>(null);
  const request = useRef(0);

  const existing =
    purpose === 'favourite'
      ? favourites.find((s) => s.id === siteId)?.coords
      : purpose === 'delivery'
        ? draft.delivery?.coords
        : draft.pickup?.coords;
  const [start] = useState<LatLng>(existing ?? (purpose === 'delivery' ? draft.pickup?.coords : undefined) ?? FALLBACK);
  const [center, setCenter] = useState<LatLng>(start);
  const [address, setAddress] = useState<string | null>(null);
  // Both start "busy": the first address lookup (and GPS fix for a new pickup) begin on open.
  const [resolving, setResolving] = useState(MAPS_AVAILABLE);
  const [moving, setMoving] = useState(false);
  const [locating, setLocating] = useState(MAPS_AVAILABLE && purpose === 'pickup' && !existing);

  const pinLift = useSharedValue(0);
  const pinStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -pinLift.value }] }));

  function resolve(point: LatLng) {
    request.current += 1;
    setResolving(true);
    lookup(point, request.current);
  }

  async function lookup(point: LatLng, id: number) {
    try {
      const [place] = await Location.reverseGeocodeAsync(point);
      if (id !== request.current) return; // a newer pin position superseded this lookup
      const parts = [place?.name, place?.street, place?.district, place?.city].filter((p): p is string => !!p);
      setAddress(parts.length ? [...new Set(parts)].join(', ') : null);
    } catch {
      if (id === request.current) setAddress(null);
    } finally {
      if (id === request.current) setResolving(false);
    }
  }

  function goToMyLocation() {
    tapHaptic();
    setLocating(true);
    centerOnGps();
  }

  async function centerOnGps() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.granted) {
        const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        map.current?.centerOn({ latitude: coords.latitude, longitude: coords.longitude });
      }
    } catch {
      // Stay where the map is; the customer can keep moving it by hand.
    } finally {
      setLocating(false);
    }
  }

  // Pickup with no site yet starts at the customer's GPS (C05); delivery never jumps to it.
  useEffect(() => {
    if (!MAPS_AVAILABLE) return;
    if (purpose === 'pickup' && !existing) centerOnGps();
    request.current += 1;
    lookup(start, request.current);
    // Run once on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function confirm() {
    successHaptic();
    const site = { label: address ?? t('pinnedLocation'), source: 'map' as const, coords: center };
    if (purpose === 'favourite') {
      if (siteId) editSite(siteId, { label: site.label, coords: center });
      else addSite({ label: site.label, coords: center });
      router.back();
      return;
    }
    update(purpose === 'delivery' ? { delivery: site } : { pickup: site });
    router.back();
  }

  const title = purpose === 'delivery' ? t('mapDeliveryTitle') : t('mapPickupTitle');

  if (!MAPS_AVAILABLE) {
    return (
      <SafeAreaView style={styles.fallback}>
        <EmptyState icon={MapIcon} title={t('mapUnavailable')} body={t('mapUnavailableSub')} />
        <PrimaryButton label={t('back')} onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <PickerMap
        ref={map}
        initial={start}
        onMoveStart={() => {
          setMoving(true);
          pinLift.set(withSpring(10));
        }}
        onIdle={(point) => {
          setMoving(false);
          pinLift.set(withSpring(0, { damping: 12 }));
          setCenter(point);
          resolve(point);
        }}
      />

      {/* Fixed centre pin: its tip marks the point. */}
      <View pointerEvents="none" style={styles.pinWrap}>
        <Animated.View style={pinStyle}>
          <MapPin size={44} color={Brand.onPrimary} strokeWidth={2} fill={Brand.primary} />
        </Animated.View>
        <View style={styles.pinShadow} />
      </View>

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
        <View style={styles.hintPill}>
          <Text style={styles.hint}>{t('movePinHint')}</Text>
        </View>
      </SafeAreaView>

      <View style={styles.controls}>
        <Pressable onPress={() => map.current?.zoomBy(1)} accessibilityRole="button" accessibilityLabel={t('zoomIn')} style={styles.round}>
          <Plus size={22} color={Brand.text} strokeWidth={2.25} />
        </Pressable>
        <Pressable onPress={() => map.current?.zoomBy(-1)} accessibilityRole="button" accessibilityLabel={t('zoomOut')} style={styles.round}>
          <Minus size={22} color={Brand.text} strokeWidth={2.25} />
        </Pressable>
        <Pressable onPress={goToMyLocation} accessibilityRole="button" accessibilityLabel={t('useCurrentLocation')} style={styles.round}>
          {locating ? <ActivityIndicator color={Brand.link} /> : <LocateFixed size={22} color={Brand.link} strokeWidth={2.25} />}
        </Pressable>
      </View>

      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <Text style={styles.sheetLabel}>{title}</Text>
        <View style={styles.addressRow}>
          <MapPin size={20} color={Brand.link} strokeWidth={2} />
          {resolving || moving ? (
            <Text style={styles.addressMuted}>{t('findingAddress')}</Text>
          ) : (
            <Text style={styles.address} numberOfLines={2}>
              {address ?? t('noAddressKeepPin')}
            </Text>
          )}
        </View>
        <PrimaryButton label={t('confirmLocation')} onPress={confirm} disabled={moving || resolving} loading={resolving} />
      </SafeAreaView>
    </View>
  );
}

const ROUND = 48;

const useStyles = makeStyles((Brand) => ({
  root: {
    flex: 1,
    backgroundColor: '#E8E4DF',
  },
  fallback: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: Brand.card,
  },
  pinWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // Lift the icon so its tip, not its middle, sits on the map centre.
    paddingBottom: 44,
  },
  pinShadow: {
    width: 12,
    height: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
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
    elevation: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.text,
  },
  hintPill: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Brand.onPrimary,
  },
  hint: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  controls: {
    position: 'absolute',
    right: 16,
    bottom: 230,
    gap: 10,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Brand.card,
    gap: 12,
  },
  sheetLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Brand.muted,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    minHeight: 44,
  },
  address: {
    flex: 1,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600',
    color: Brand.text,
  },
  addressMuted: {
    flex: 1,
    fontSize: 16,
    color: Brand.muted,
  },
}));
