import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FleetSheet } from '@/components/home/fleet-sheet';
import { RevealItem } from '@/components/splash/splash-reveal';
import { TabScreen } from '@/components/tab-screen';
import { ArrowRight, CalendarClock, ChevronDown, ChevronRight, History, Languages, MapPin, Mic, Truck, X } from '@/components/ui/icons';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BRAND_FOOTER } from '@/constants/images';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { BOOKING_PATH, BOOKING_STEPS, draftProgress, useBooking } from '@/lib/booking';
import { CATEGORIES, type CategoryId, getItem, pick, type Vehicle, VEHICLES } from '@/lib/catalog';
import { choiceHaptic, tapHaptic } from '@/lib/haptics';
import { getServiceStatus } from '@/lib/service-status';
import { useSession } from '@/lib/session';
import { asSite, useSites } from '@/lib/sites';
import { formatWhen } from '@/lib/trip-format';
import { useTrips } from '@/lib/trips';
import { useCurrentPlace } from '@/lib/use-current-place';

const FLEET = Object.values(VEHICLES);
const INK_SOFT = 'rgba(31, 31, 31, 0.72)';

/**
 * Customer Home (handoff C02): an orange location band with "Book a truck"
 * and "Speak to book", the live delivery (which also floats above the tab
 * bar once scrolled away), then materials, trucks and favourite sites.
 */
export default function HomeScreen() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t, language, setLanguage, session } = useSession();
  const { activeTrip, nextScheduled } = useTrips();
  const { favourites } = useSites();
  const { draft, start, reset } = useBooking();
  const { place, retry } = useCurrentPlace();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [fleet, setFleet] = useState<Vehicle | null>(null);
  const scrollY = useSharedValue(0);

  const customer = session?.kind === 'customer' ? session : null;
  const initial = (customer?.name ?? '').trim().charAt(0).toUpperCase();

  const placeText =
    place.status === 'ready'
      ? place.label
      : place.status === 'locating'
        ? t('locating')
        : place.status === 'denied'
          ? t('locationDenied')
          : place.status === 'no-address'
            ? t('locationNoAddress')
            : t('locationUnavailable');

  const progress = draftProgress(draft);
  const draftItem = getItem(draft.itemId);

  /** Re-opens every step reached so far, so Back still walks the booking in order. */
  function resume() {
    choiceHaptic();
    BOOKING_PATH.slice(0, progress + 1).forEach((path) => router.push(path));
  }

  // "Book a truck" continues an unfinished booking; a tile or favourite is a new intent and starts fresh.
  function book(options?: Parameters<typeof start>[0]) {
    // Can't take a booking right now (offline, rain, busy, down, out of area): say so first.
    if (getServiceStatus() !== 'ok') return router.push('/service');
    if (!options && progress > 0) return resume();
    choiceHaptic();
    start(options);
    router.push(options?.category ? { pathname: '/book/material', params: { category: options.category } } : '/book/material');
  }

  const header = (
    <View style={[styles.band, { paddingTop: insets.top + 14 }]}>
      <RevealItem index={0} style={styles.bandRow}>
        <Pressable
          // Location access: asks for permission (or opens Settings when the phone no longer asks) and refreshes the place.
          onPress={() => (place.status === 'denied' && !place.canAskAgain ? Linking.openSettings() : retry())}
          accessibilityRole="button"
          accessibilityLabel={`${t('currentPlace')}. ${placeText}`}
          style={styles.place}>
          <View style={styles.placeTitleRow}>
            <MapPin size={20} color={Brand.onPrimary} strokeWidth={2.25} fill="#FFFFFF" fillOpacity={0.6} />
            <Text style={styles.placeTitle} numberOfLines={1}>
              {place.status === 'ready' ? place.label.split(',')[0] : t('currentPlace')}
            </Text>
            <ChevronDown size={18} color={Brand.onPrimary} strokeWidth={2.5} />
          </View>
          <Text style={styles.placeSub} numberOfLines={1}>
            {placeText}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            choiceHaptic();
            setLanguage(language === 'en' ? 'ml' : 'en');
          }}
          accessibilityRole="button"
          accessibilityLabel={language === 'en' ? 'മലയാളം' : 'English'}
          style={styles.roundButton}>
          <Languages size={22} color={Brand.onPrimary} strokeWidth={2} />
        </Pressable>
        <Pressable onPress={() => router.navigate('/profile')} accessibilityRole="button" accessibilityLabel={t('tabProfile')} style={styles.avatar}>
          {customer?.photoUri ? (
            <Image source={{ uri: customer.photoUri }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <Text style={styles.avatarText}>{initial || '·'}</Text>
          )}
        </Pressable>
      </RevealItem>

      <RevealItem index={1} style={styles.actions}>
        <PressableScale onPress={() => book()} accessibilityRole="button" accessibilityLabel={t('bookTruck')} style={styles.bookBar}>
          <View style={styles.bookIcon}>
            <Truck size={20} color={Brand.onPrimary} strokeWidth={2.25} />
          </View>
          <Text style={styles.bookText}>{t('bookTruck')}</Text>
          <ArrowRight size={20} color={Brand.link} strokeWidth={2.5} />
        </PressableScale>
        <PressableScale
          onPress={() => {
            choiceHaptic();
            router.push('/book/voice');
          }}
          accessibilityRole="button"
          accessibilityLabel={t('speakToBook')}
          style={styles.micButton}>
          <Mic size={22} color={Brand.link} strokeWidth={2.25} />
        </PressableScale>
      </RevealItem>
    </View>
  );

  return (
    <TabScreen
      header={header}
      scrollY={scrollY}>
      {/* The live trip shows in the bar above the tab bar (LiveTripBar), not as a second card here. */}
      {!activeTrip &&
        nextScheduled && (
          <RevealItem index={2}>
            <PressableScale
              onPress={() => router.push({ pathname: '/trip/[id]', params: { id: nextScheduled.id } })}
              accessibilityRole="button"
              style={styles.scheduled}>
              <View style={styles.scheduledIcon}>
                <CalendarClock size={20} color={Brand.link} strokeWidth={2.25} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.scheduledTitle} numberOfLines={1}>
                  {formatWhen(language, nextScheduled.when)}
                </Text>
                <Text style={styles.scheduledSub} numberOfLines={1}>
                  {nextScheduled.material} · {nextScheduled.code}
                </Text>
              </View>
              <ChevronRight size={20} color={Brand.muted} strokeWidth={2.25} />
            </PressableScale>
          </RevealItem>
        )}

      {draftItem && progress > 0 && !activeTrip && (
        <RevealItem index={2}>
          <View style={styles.resume}>
            <PressableScale onPress={resume} accessibilityRole="button" accessibilityLabel={t('resumeBooking')} style={styles.resumeMain}>
              <ImagePlaceholder source={draftItem.image} tint={draftItem.tint} icon={Truck} iconSize={18} style={styles.resumeThumb} />
              <View style={styles.flex}>
                <Text style={styles.resumeTitle} numberOfLines={1}>
                  {t('resumeBooking')}
                </Text>
                <Text style={styles.resumeSub} numberOfLines={1}>
                  {pick(draftItem.name, language)} · {t('stepOf', { n: progress + 1, total: BOOKING_STEPS })}
                </Text>
              </View>
            </PressableScale>
            <Pressable
              onPress={() => {
                choiceHaptic();
                reset();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('startOver')}
              hitSlop={8}
              style={styles.resumeClose}>
              <X size={16} color={Brand.muted} strokeWidth={2.25} />
            </Pressable>
          </View>
        </RevealItem>
      )}

      <RevealItem index={3}>
        <View style={styles.sectionRow}>
          <Text style={[styles.section, styles.sectionInRow]}>{t('materialsShort')}</Text>
          {/* The full menu: every material, searchable. */}
          <Pressable onPress={() => book()} accessibilityRole="button" accessibilityLabel={t('seeAllMaterials')} hitSlop={8} style={styles.seeAll}>
            <Text style={styles.seeAllText}>{t('seeAll')}</Text>
            <ArrowRight size={16} color={Brand.link} strokeWidth={2.5} />
          </Pressable>
        </View>
        <View style={styles.materials}>
          {CATEGORIES.map((category) => (
            <PressableScale
              key={category.id}
              onPress={() => book({ category: category.id as CategoryId })}
              accessibilityRole="button"
              accessibilityLabel={pick(category.title, language)}
              style={styles.material}>
              <ImagePlaceholder source={category.image} tint={category.tint} icon={category.icon} iconSize={22} style={styles.materialImage} />
              <Text style={styles.tileLabel} numberOfLines={1}>
                {pick(category.title, language).split(/[ &]/)[0]}
              </Text>
            </PressableScale>
          ))}
        </View>
      </RevealItem>

      <RevealItem index={4}>
        <Text style={styles.section}>{t('trucksShort')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fleetRow}>
          {FLEET.map((vehicle) => (
            <PressableScale
              key={vehicle.id}
              onPress={() => {
                tapHaptic();
                setFleet(vehicle);
              }}
              accessibilityRole="button"
              accessibilityLabel={vehicle.name}
              style={styles.fleet}>
              <ImagePlaceholder source={vehicle.image} tint={['#CBD2DA', '#6B7480']} icon={Truck} iconSize={20} style={styles.fleetImage} />
              <Text style={styles.tileLabel} numberOfLines={2}>
                {pick(vehicle.local, language)}
              </Text>
              <Text style={styles.tileSub} numberOfLines={1}>
                {pick(vehicle.capacity, language).split(' · ')[0]}
              </Text>
            </PressableScale>
          ))}
        </ScrollView>
      </RevealItem>

      <RevealItem index={5}>
        <Text style={styles.section}>{t('favouriteSites')}</Text>
        {favourites.length === 0 ? (
          <Text style={styles.empty}>{t('noFavourites')}</Text>
        ) : (
          <View style={styles.favList}>
            {favourites.slice(0, 3).map((site, i) => (
              <Pressable
                key={site.id}
                onPress={() => book({ delivery: asSite(site) })}
                accessibilityRole="button"
                accessibilityLabel={`${t('rebookTo')} ${site.label}`}
                style={({ pressed }) => [styles.fav, i > 0 && styles.favBorder, pressed && styles.pressed]}>
                <History size={20} color={Brand.link} strokeWidth={2} />
                <View style={styles.flex}>
                  <Text style={styles.favName} numberOfLines={1}>
                    {site.label.split(',')[0]}
                  </Text>
                  <Text style={styles.favMeta} numberOfLines={1}>
                    {site.uses}× · {site.label.split(',').slice(1).join(',').trim() || site.label}
                  </Text>
                </View>
                <View style={styles.favGo}>
                  <ArrowRight size={16} color={Brand.link} strokeWidth={2.5} />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </RevealItem>

      {/* Brand footer: the #go pickr art closes the scroll, full-bleed, background cut out. */}
      <RevealItem index={6} style={styles.brand}>
        <View style={[styles.brandCard, { width: windowWidth }]}>
          <Image
            source={BRAND_FOOTER}
            style={styles.brandImage}
            contentFit="cover"
            transition={250}
            accessibilityRole="image"
            accessibilityLabel="#go pickr — Made for India, Crafted in Kerala"
          />
          {/* The art's flat top edge melts into the page instead of ending on a line. */}
          <Svg pointerEvents="none" style={styles.brandFade} width="100%" height={72}>
            <Defs>
              <LinearGradient id="brandFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={Brand.card} stopOpacity={1} />
                <Stop offset="1" stopColor={Brand.card} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#brandFade)" />
          </Svg>
        </View>
      </RevealItem>

      <FleetSheet
        vehicle={fleet}
        onClose={() => setFleet(null)}
        onBook={() => {
          setFleet(null);
          book();
        }}
      />
    </TabScreen>
  );
}

const useStyles = makeStyles((Brand) => ({
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  band: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 16,
    backgroundColor: Brand.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  place: {
    flex: 1,
    gap: 2,
  },
  placeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  placeTitle: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: '800',
    color: Brand.onPrimary,
  },
  placeSub: {
    fontSize: 14,
    fontWeight: '500',
    color: INK_SOFT,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: Brand.selected,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.link,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  bookBar: {
    flex: 1,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 8,
    paddingRight: 16,
    borderRadius: 18,
    backgroundColor: Brand.card,
    shadowColor: '#7C2D12',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bookIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: Brand.text,
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C2D12',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  scheduled: {
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 20,
    backgroundColor: Brand.surface,
  },
  scheduledIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Brand.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduledTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.text,
  },
  scheduledSub: {
    marginTop: 2,
    fontSize: 13,
    color: Brand.muted,
  },
  resume: {
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Brand.border,
  },
  resumeMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resumeThumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  resumeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.text,
  },
  resumeSub: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: Brand.muted,
  },
  resumeClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 12,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: Brand.text,
  },
  materials: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  material: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  // 4:3 like the photos themselves: the whole pile shows, not a square cut from its middle.
  materialImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 18,
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.text,
    textAlign: 'center',
  },
  fleetRow: {
    gap: 12,
    paddingBottom: 28,
  },
  fleet: {
    width: 108,
    alignItems: 'center',
    gap: 4,
  },
  tileSub: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: Brand.muted,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionInRow: {
    flex: 1,
  },
  seeAll: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.link,
  },
  brandFade: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  fleetImage: {
    width: 108,
    height: 81,
    borderRadius: 16,
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    color: Brand.muted,
  },
  favList: {
    borderRadius: 20,
    backgroundColor: Brand.surface,
    paddingHorizontal: 16,
  },
  fav: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  favBorder: {
    borderTopWidth: 1,
    borderTopColor: Brand.border,
  },
  favName: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.text,
  },
  favMeta: {
    marginTop: 2,
    fontSize: 13,
    color: Brand.muted,
  },
  favGo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Only reached at the very end of the scroll, a screen-gap below the last section.
  brand: {
    marginTop: 40,
  },
  // Full-bleed brand art with its background cut out (transparent WebP), so it
  // sits straight on the page in light and dark mode.
  brandCard: {
    alignSelf: 'center',
  },
  brandImage: {
    width: '100%',
    aspectRatio: 1024 / 765,
  },
}));
