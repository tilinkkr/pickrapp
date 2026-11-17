import { Image, type ImageProps } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrackMap } from '@/components/trip/track-map';
import { EmptyState } from '@/components/trips/empty-state';
import { tripAmount } from '@/components/trips/trip-card';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ChevronDown, ChevronLeft, FileText } from '@/components/ui/icons';
import { IconChip, MIcon, type MIconName } from '@/components/ui/m-icon';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { shortVehicleName } from '@/lib/booking-format';
import { type FareLineKey, tripFare } from '@/lib/fare';
import { selectionHaptic } from '@/lib/haptics';
import { photoSource } from '@/lib/load-photos';
import { enterAt, STAGGER_MS } from '@/lib/motion';
import { meetsText, personLine } from '@/lib/people';
import { useSession } from '@/lib/session';
import { formatDay, formatRupees, formatTime, placeName, stageColors } from '@/lib/trip-format';
import { useTrips } from '@/lib/trips';

const FARE_LABEL: Record<FareLineKey, 'fareBase' | 'fareDistance' | 'fareWaiting' | 'fareRain' | 'farePlatform' | 'fareGst'> = {
  base: 'fareBase',
  distance: 'fareDistance',
  waiting: 'fareWaiting',
  rain: 'fareRain',
  platform: 'farePlatform',
  gst: 'fareGst',
};
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
const rise = (row: number) => enterAt(0, row * STAGGER_MS * 1.5);

function duration(from?: Date, to?: Date) {
  if (!from || !to) return null;
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

/**
 * One finished trip (C19/C21 record). The demo map sits on top; the record
 * is a sheet that slides up over it, as separate cards split by hairlines:
 * summary · route · driver and truck · load photos · timeline · fare.
 * Every value has room: dates and times are never cut short.
 */
export default function LoadDetail() {
  const Brand = useBrand();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useSession();
  const { trips } = useTrips();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [fareOpen, setFareOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const trip = trips.find((x) => x.id === id);
  const mapHeight = Math.round(height * 0.34);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const mapStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, mapHeight], [1, 0.3], 'clamp'),
    transform: [{ translateY: -scrollY.value * 0.4 }],
  }));

  if (!trip) {
    return (
      <SafeAreaView style={styles.root}>
        <EmptyState icon={FileText} title={t('notFound')} />
      </SafeAreaView>
    );
  }

  const colors = stageColors(trip.stage, Brand);
  const fare = tripFare(trip);
  // DEMO: trips recorded before photo upload existed show catalogue pictures, tagged as demo.
  const real = trip.loadPhotos ?? [];
  const demoPhotos = real.length === 0 && trip.stage === 'completed' && !trip.photosSkipped;
  const photos = (demoPhotos ? [`item:${trip.itemId ?? ''}`, `vehicle:${trip.vehicleId ?? ''}`] : real).filter((key) => photoSource(key));
  const captions = [t('photoAtPickup'), t('photoLoaded')];
  const overall = duration(trip.pickupAt ?? trip.when, trip.completedAt ?? trip.paidAt);
  const timeline: [string, Date | undefined][] = [
    [t('bookedAt'), trip.when],
    [t('pickedUp'), trip.startedAt ?? trip.pickupAt],
    [t('droppedAt'), trip.completedAt ?? trip.dropAt],
    [t('short_completed'), trip.paidAt],
  ];

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.map, { height: mapHeight }, mapStyle]}>
        <TrackMap trip={trip} pickupLabel={placeName(trip.pickup)} deliveryLabel={placeName(trip.delivery)} note={t('demoMap')} />
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: mapHeight - 24, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.sheet, { minHeight: height - insets.top - 60 }]}>
          <View style={styles.grabber} />

          <Animated.View entering={rise(0)} style={styles.card}>
            <View style={styles.summary}>
              <View style={styles.flex}>
                <Text style={styles.kicker}>{trip.code}</Text>
                <Text style={styles.h1}>
                  {trip.material} · {trip.quantity.split(' · ')[0]}
                </Text>
              </View>
              <View style={styles.summaryEnd}>
                <Text style={styles.amount}>{tripAmount(trip) ?? '—'}</Text>
                <View style={[styles.chip, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.chipText, { color: colors.fg }]}>{t(`short_${trip.stage}` as 'short_completed')}</Text>
                </View>
              </View>
            </View>
            <View style={styles.cells}>
              <Cell label={t('dateLabel')} value={formatDay(language, trip.when)} />
              <Cell label={t('timeLabel')} value={formatTime(language, trip.when)} divided />
              <Cell label={t('overallTime')} value={overall ?? '—'} divided />
            </View>
          </Animated.View>

          <Animated.View entering={rise(1)} style={styles.card}>
            <Row icon="circle-outline" label={t('pickupLabel')} value={trip.pickup} />
            <Row icon="map-marker" label={t('dropLabel')} value={trip.delivery} divided />
            {trip.forOther && (
              <Row
                icon="account-arrow-right-outline"
                label={`${t('bookedFor')} · ${meetsText(t, trip.forOther.meets)}`}
                value={personLine(trip.forOther)}
                divided
              />
            )}
          </Animated.View>

          {trip.driver && (
            <Animated.View entering={rise(2)} style={styles.card}>
              <View style={styles.row}>
                <IconChip name="account-hard-hat" size={44} tone="neutral" />
                <View style={styles.flex}>
                  <Text style={styles.rowLabel}>{t('driverLabel')}</Text>
                  <Text style={styles.rowValue}>{trip.driver.name}</Text>
                </View>
              </View>
              <View style={[styles.row, styles.divided]}>
                <IconChip name="dump-truck" size={44} />
                <View style={styles.flex}>
                  <Text style={styles.rowLabel}>{t('truckLabel')}</Text>
                  <Text style={styles.rowValue}>{shortVehicleName(trip.vehicle)}</Text>
                </View>
                {trip.registration && (
                  <View style={styles.plate}>
                    <Text style={styles.plateText}>{trip.registration}</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          <Animated.View entering={rise(3)} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{t('loadPhotosTitle')}</Text>
              {demoPhotos && <Text style={styles.demoTag}>{t('demoWord')}</Text>}
            </View>
            {photos.length > 0 ? (
              <View style={styles.photos}>
                {photos.slice(0, 2).map((key, i) => (
                  <Pressable key={key} onPress={() => setPhoto(key)} accessibilityRole="imagebutton" accessibilityLabel={captions[i]} style={styles.photoCell}>
                    <Image source={photoSource(key) as ImageProps['source']} style={styles.photo} contentFit="cover" transition={150} />
                    <Text style={styles.caption}>{captions[i]}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.empty}>{trip.photosSkipped ? t('photosSkipped') : t('noPhotosYet')}</Text>
            )}
          </Animated.View>

          <Animated.View entering={rise(4)} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{t('timeline')}</Text>
            </View>
            {timeline.map(([label, at], i) => (
              <View key={label} style={styles.step}>
                <View style={styles.stepRail}>
                  <View style={[styles.stepDot, at && styles.stepDotOn]} />
                  {i < timeline.length - 1 && <View style={[styles.stepLine, at && styles.stepLineOn]} />}
                </View>
                <Text style={[styles.stepLabel, !at && styles.mutedText]}>{label}</Text>
                <Text style={styles.stepTime}>{at ? `${formatDay(language, at)} · ${formatTime(language, at)}` : '—'}</Text>
              </View>
            ))}
            <View style={styles.cardFoot} />
          </Animated.View>

          <Animated.View entering={rise(5)} style={styles.card}>
            <Pressable
              onPress={() => {
                selectionHaptic();
                setFareOpen((open) => !open);
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: fareOpen }}
              style={styles.cardHead}>
              <Text style={styles.cardTitle}>{t('fareDetails')}</Text>
              <Text style={styles.total}>₹{formatRupees(trip.amount ?? fare.total)}</Text>
              <View style={fareOpen && styles.flip}>
                <ChevronDown size={18} color={Brand.link} strokeWidth={2.5} />
              </View>
            </Pressable>
            {fareOpen && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.fare}>
                {fare.lines.map((line) => (
                  <View key={line.key} style={styles.line}>
                    <Text style={styles.lineLabel}>{t(FARE_LABEL[line.key])}</Text>
                    <Text style={styles.lineValue}>₹{formatRupees(line.amount)}</Text>
                  </View>
                ))}
              </Animated.View>
            )}
          </Animated.View>
        </View>
      </Animated.ScrollView>

      <SafeAreaView edges={['top']} style={styles.backWrap} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={6} style={styles.back}>
          <ChevronLeft size={26} color={Brand.text} strokeWidth={2.25} />
        </Pressable>
      </SafeAreaView>

      <BottomSheet visible={photo !== null} title={t('loadPhotosTitle')} closeLabel={t('close')} onClose={() => setPhoto(null)}>
        {photo && <Image source={photoSource(photo) as ImageProps['source']} style={styles.large} contentFit="contain" />}
      </BottomSheet>
    </View>
  );
}

/** One of three equal cells: a small label over a value that shrinks to fit rather than cut off. */
function Cell({ label, value, divided }: { label: string; value: string; divided?: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.cell, divided && styles.cellDivided]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.cellValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
    </View>
  );
}

function Row({ icon, label, value, divided }: { icon: MIconName; label: string; value: string; divided?: boolean }) {
  const Brand = useBrand();
  const styles = useStyles();
  return (
    <View style={[styles.row, divided && styles.divided]}>
      <MIcon name={icon} size={20} color={Brand.primary} />
      <View style={styles.flex}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  root: {
    flex: 1,
    backgroundColor: Brand.surface,
  },
  flex: {
    flex: 1,
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  sheet: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Brand.surface,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Brand.border,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
    overflow: 'hidden',
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: Brand.border,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  summaryEnd: {
    alignItems: 'flex-end',
    gap: 6,
  },
  kicker: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: Brand.muted,
  },
  h1: {
    marginTop: 2,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    color: Brand.text,
  },
  amount: {
    fontSize: 22,
    fontWeight: '800',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  cells: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Brand.border,
  },
  cell: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 2,
  },
  cellDivided: {
    borderLeftWidth: 1,
    borderLeftColor: Brand.border,
  },
  cellValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.muted,
  },
  rowValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: Brand.text,
  },
  plate: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#1C1917',
    backgroundColor: '#FFFFFF',
  },
  plateText: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1917',
  },
  cardHead: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  cardFoot: {
    height: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: Brand.text,
  },
  demoTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: Brand.selected,
    fontSize: 11,
    fontWeight: '800',
    color: Brand.link,
  },
  photos: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  photoCell: {
    flex: 1,
    gap: 6,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 14,
    backgroundColor: Brand.surface,
  },
  caption: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.muted,
  },
  empty: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    fontSize: 14,
    color: Brand.muted,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    minHeight: 34,
  },
  stepRail: {
    width: 12,
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingTop: 4,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Brand.border,
  },
  stepDotOn: {
    backgroundColor: Brand.primary,
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: Brand.border,
  },
  stepLineOn: {
    backgroundColor: Brand.primary,
  },
  stepLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Brand.text,
  },
  mutedText: {
    color: Brand.muted,
  },
  stepTime: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.muted,
    fontVariant: ['tabular-nums'],
  },
  total: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  flip: {
    transform: [{ rotate: '180deg' }],
  },
  fare: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lineLabel: {
    fontSize: 14,
    color: Brand.muted,
  },
  lineValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
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
    borderWidth: 1,
    borderColor: Brand.border,
  },
  large: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
  },
}));
