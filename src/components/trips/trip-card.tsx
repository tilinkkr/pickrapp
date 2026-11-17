import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { ChevronRight, Package } from '@/components/ui/icons';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { MIcon } from '@/components/ui/m-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { shortVehicleName } from '@/lib/booking-format';
import { getItem } from '@/lib/catalog';
import { selectionHaptic } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import { formatDay, formatRupees, formatTime, stageColors } from '@/lib/trip-format';
import { isPast, type Trip } from '@/lib/trips';

/** The figure a card shows: the amount once known, nothing for failed trips. */
export function tripAmount(trip: Trip) {
  if (trip.stage === 'cancelled' || trip.stage === 'no_driver') return null;
  const amount = trip.amount ?? trip.quote;
  return amount != null ? `₹${formatRupees(amount)}` : null;
}

/**
 * One trip as a ticket in three bands split by hairlines (ride-app pattern):
 * what and how much · from → to · when and status. Nothing is truncated to
 * "Sun, 8 Nov…": the date and time have their own band. Tapping opens the
 * live trip, or the full record once it is over.
 */
export function TripCard({ trip }: { trip: Trip }) {
  const Brand = useBrand();
  const styles = useStyles();
  const { t, language } = useSession();
  const colors = stageColors(trip.stage, Brand);
  const item = getItem(trip.itemId);
  const amount = tripAmount(trip);

  return (
    <PressableScale
      onPress={() => {
        selectionHaptic();
        router.push(isPast(trip) ? { pathname: '/loads/[id]', params: { id: trip.id } } : { pathname: '/trip/[id]', params: { id: trip.id } });
      }}
      accessibilityRole="button"
      accessibilityLabel={`${trip.material}, ${t(`stage_${trip.stage}`)}, ${trip.pickup} → ${trip.delivery}${amount ? `, ${amount}` : ''}`}
      style={styles.card}>
      <View style={styles.top}>
        <ImagePlaceholder source={item?.image} tint={item?.tint ?? ['#FED7AA', '#F97316']} icon={Package} iconSize={18} style={styles.thumb} />
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={1}>
            {trip.material} · {trip.quantity.split(' · ')[0]}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {shortVehicleName(trip.vehicle)} · {trip.code}
          </Text>
          {trip.forOther && (
            <View style={styles.forRow}>
              <MIcon name="account-arrow-right-outline" size={14} color={Brand.link} />
              <Text style={styles.forText} numberOfLines={1}>
                {t('forName', { name: trip.forOther.name })}
              </Text>
            </View>
          )}
        </View>
        {amount && <Text style={styles.amount}>{amount}</Text>}
      </View>

      <View style={styles.route}>
        <View style={styles.rail}>
          <View style={styles.dotFrom} />
          <View style={styles.railLine} />
          <View style={styles.dotTo} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.place} numberOfLines={1}>
            {trip.pickup}
          </Text>
          <Text style={[styles.place, styles.placeTo]} numberOfLines={1}>
            {trip.delivery}
          </Text>
        </View>
      </View>

      <View style={styles.foot}>
        <MIcon name="calendar-blank-outline" size={15} color={Brand.muted} />
        <Text style={styles.when}>
          {formatDay(language, trip.when)} · {formatTime(language, trip.when)}
        </Text>
        <View style={styles.flex} />
        <View style={[styles.chip, { backgroundColor: colors.bg }]}>
          <Text style={[styles.chipText, { color: colors.fg }]}>{t(`short_${trip.stage}` as 'short_to_pickup')}</Text>
        </View>
        <ChevronRight size={18} color={Brand.muted} strokeWidth={2.25} />
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles((Brand) => ({
  flex: {
    flex: 1,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
    overflow: 'hidden',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  thumb: {
    width: 48,
    height: 36,
    borderRadius: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.text,
  },
  sub: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Brand.muted,
  },
  forRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  forText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    color: Brand.link,
  },
  amount: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  route: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
  },
  rail: {
    width: 12,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dotFrom: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2.5,
    borderColor: Brand.primary,
    backgroundColor: Brand.card,
  },
  railLine: {
    flex: 1,
    width: 2,
    marginVertical: 2,
    backgroundColor: Brand.border,
  },
  dotTo: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: Brand.primary,
  },
  place: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: Brand.text,
  },
  placeTo: {
    marginTop: 10,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  when: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.muted,
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
}));
