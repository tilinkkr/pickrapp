import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { ScreenTitle, TabScreen } from '@/components/tab-screen';
import { EmptyState } from '@/components/trips/empty-state';
import { TripCard } from '@/components/trips/trip-card';
import { IndianRupee, type LucideIcon, Navigation, Truck } from '@/components/ui/icons';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { selectionHaptic } from '@/lib/haptics';
import type { StringKey } from '@/lib/i18n';
import { STAGGER_MS } from '@/lib/motion';
import { useSession } from '@/lib/session';
import { formatRupees } from '@/lib/trip-format';
import { isActive, isPast, type Trip, useTrips } from '@/lib/trips';

type Filter = 'all' | 'ongoing' | 'past';

const FILTERS: { value: Filter; label: StringKey; match: (trip: Trip) => boolean }[] = [
  // Scheduled bookings live on the Requests tab.
  { value: 'all', label: 'filterAll', match: (trip) => trip.stage !== 'scheduled' },
  { value: 'ongoing', label: 'filterOngoing', match: isActive },
  { value: 'past', label: 'filterPast', match: isPast },
];

/**
 * Loads (handoff C21): a three-number summary for this month, filter chips,
 * then one summary card per trip. Cards open the live trip or the full record.
 */
export default function LoadsScreen() {
  const styles = useStyles();
  const { t } = useSession();
  const { trips, demoActive } = useTrips();
  const [filter, setFilter] = useState<Filter>('all');

  const loads = trips.filter(FILTERS[0].match);
  const shown = trips.filter(FILTERS.find((f) => f.value === filter)!.match);
  const month = new Date();
  const thisMonth = loads.filter((trip) => trip.when.getMonth() === month.getMonth() && trip.when.getFullYear() === month.getFullYear());
  const spent = thisMonth.filter((trip) => trip.paid && trip.amount != null).reduce((sum, trip) => sum + (trip.amount ?? 0), 0);
  const active = loads.filter(isActive).length;

  return (
    <TabScreen>
      <ScreenTitle>{t('tabLoads')}</ScreenTitle>

      {loads.length > 0 && (
        <View style={styles.stats}>
          <Stat icon={Truck} value={String(thisMonth.length)} label={t('thisMonth')} />
          <Stat icon={IndianRupee} value={`₹${formatRupees(spent)}`} label={t('spent')} divided />
          <Stat icon={Navigation} value={String(active)} label={t('activeNow')} highlight={active > 0} divided />
        </View>
      )}

      {loads.length > 0 && (
        <View style={styles.filters} accessibilityRole="tablist">
          {FILTERS.map((f) => {
            const selected = f.value === filter;
            return (
              <Pressable
                key={f.value}
                onPress={() => {
                  if (selected) return;
                  selectionHaptic();
                  setFilter(f.value);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{t(f.label)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.list}>
        {loads.length === 0 ? (
          <EmptyState icon={Truck} title={t('noLoads')} body={t('noLoadsSub')} />
        ) : shown.length === 0 ? (
          <EmptyState icon={Truck} title={t('noLoadsFiltered')} />
        ) : (
          // "All" is shown in sections, what is happening now first; a filter shows one plain list.
          (filter === 'all'
            ? [
                { title: t('ongoingLoads'), trips: shown.filter(isActive) },
                { title: t('pastLoads'), trips: shown.filter(isPast) },
              ].filter((section) => section.trips.length > 0)
            : [{ title: '', trips: shown }]
          ).map((section) => (
            <View key={section.title} style={styles.sectionBlock}>
              {section.title !== '' && (
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionCount}>{section.trips.length}</Text>
                  <View style={styles.sectionLine} />
                </View>
              )}
              {section.trips.map((trip, i) => (
                <Animated.View key={trip.id} entering={FadeInDown.duration(280).delay(i * STAGGER_MS * 1.5)} layout={LinearTransition.duration(200)}>
                  <TripCard trip={trip} />
                </Animated.View>
              ))}
            </View>
          ))
        )}
      </View>

      {__DEV__ && demoActive && <Text style={styles.demo}>{t('demoData')}</Text>}
    </TabScreen>
  );
}

function Stat({ icon: Icon, value, label, highlight, divided }: { icon: LucideIcon; value: string; label: string; highlight?: boolean; divided?: boolean }) {
  const Brand = useBrand();
  const styles = useStyles();
  return (
    <View style={[styles.stat, divided && styles.statDivided, highlight && styles.statOn]}>
      <Icon size={18} color={Brand.link} strokeWidth={2.25} />
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  // One outlined grid, three equal cells split by lines.
  stats: {
    marginTop: 16,
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
    overflow: 'hidden',
  },
  stat: {
    flex: 1,
    height: 92,
    paddingHorizontal: 14,
    gap: 2,
    justifyContent: 'center',
  },
  statDivided: {
    borderLeftWidth: 1,
    borderLeftColor: Brand.border,
  },
  sectionBlock: {
    gap: 12,
  },
  sectionHead: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.text,
  },
  sectionCount: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Brand.surface,
    fontSize: 12,
    fontWeight: '800',
    color: Brand.muted,
    textAlign: 'center',
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: Brand.border,
  },
  statOn: {
    backgroundColor: Brand.selected,
  },
  statValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.muted,
  },
  filters: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Brand.border,
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: Brand.primary,
    backgroundColor: Brand.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.text,
  },
  chipTextSelected: {
    color: Brand.onPrimary,
  },
  list: {
    marginTop: 16,
    gap: 12,
  },
  demo: {
    marginTop: 16,
    fontSize: 12,
    textAlign: 'center',
    color: Brand.muted,
  },
}));
