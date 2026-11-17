import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { ProfilePage } from '@/components/profile/settings';
import { EmptyState } from '@/components/trips/empty-state';
import { TripCard } from '@/components/trips/trip-card';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { CalendarRange, Truck } from '@/components/ui/icons';
import { PrimaryButton } from '@/components/ui/primary-button';
import { makeStyles } from '@/lib/app-theme';
import { selectionHaptic, successHaptic } from '@/lib/haptics';
import type { StringKey } from '@/lib/i18n';
import { enterAt, STAGGER_MS } from '@/lib/motion';
import { useSession } from '@/lib/session';
import { isActive, isPast, type Trip, useTrips } from '@/lib/trips';

type Filter = 'all' | 'ongoing' | 'scheduled' | 'past';
const FILTERS: { value: Filter; label: StringKey; match: (trip: Trip) => boolean }[] = [
  { value: 'all', label: 'filterAll', match: () => true },
  { value: 'ongoing', label: 'filterOngoing', match: (trip) => isActive(trip) && trip.stage !== 'scheduled' },
  { value: 'scheduled', label: 'filterScheduledShort', match: (trip) => trip.stage === 'scheduled' },
  { value: 'past', label: 'filterPast', match: isPast },
];

type Range = 'last30Days' | 'last90Days' | 'thisYear';
const RANGES: Range[] = ['last30Days', 'last90Days', 'thisYear'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** My rides (handoff C21 from the profile): every trip with filters, and a ride-history request in the dock. */
export default function RidesScreen() {
  const styles = useStyles();
  const { t, session } = useSession();
  const { trips } = useTrips();
  const [filter, setFilter] = useState<Filter>('all');
  const [sheet, setSheet] = useState(false);
  const [range, setRange] = useState<Range>('last30Days');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const shown = trips.filter(FILTERS.find((f) => f.value === filter)!.match);

  function openSheet() {
    setEmail(session?.kind === 'customer' ? session.email ?? '' : '');
    setSent(false);
    setSheet(true);
  }

  return (
    <ProfilePage
      title={t('myRides')}
      footer={trips.length > 0 ? <PrimaryButton label={t('requestHistory')} icon={CalendarRange} variant="outline" onPress={openSheet} /> : undefined}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} accessibilityRole="tablist">
        {FILTERS.map((f) => {
          const selected = f.value === filter;
          const count = trips.filter(f.match).length;
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
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {t(f.label)} · {count}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.list}>
        {shown.length === 0 ? (
          <EmptyState icon={Truck} title={t(trips.length === 0 ? 'noLoads' : 'noLoadsFiltered')} />
        ) : (
          shown.map((trip, i) => (
            <Animated.View key={trip.id} entering={enterAt(0, i * STAGGER_MS)} layout={LinearTransition}>
              <TripCard trip={trip} />
            </Animated.View>
          ))
        )}
      </View>

      <BottomSheet visible={sheet} title={t('requestHistory')} closeLabel={t('close')} onClose={() => setSheet(false)}>
        {sent ? (
          <Text style={styles.sheetText}>{t('historyRequested')}</Text>
        ) : (
          <View style={styles.sheet}>
            <View style={styles.ranges}>
              {RANGES.map((r) => {
                const selected = r === range;
                return (
                  <Pressable
                    key={r}
                    onPress={() => {
                      selectionHaptic();
                      setRange(r);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[styles.range, selected && styles.chipSelected]}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
                      {t(r)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="name@example.com"
              placeholderTextColor="#A8A29E"
              accessibilityLabel={t('sendToEmail')}
              style={styles.input}
            />
            <PrimaryButton
              label={t('sendToEmail')}
              disabled={!EMAIL.test(email.trim())}
              onPress={() => {
                successHaptic();
                setSent(true);
              }}
            />
          </View>
        )}
      </BottomSheet>
    </ProfilePage>
  );
}

const useStyles = makeStyles((Brand) => ({
  filters: {
    gap: 8,
  },
  chip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
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
    gap: 12,
  },
  sheet: {
    gap: 12,
  },
  sheetText: {
    fontSize: 16,
    lineHeight: 23,
    color: Brand.text,
  },
  ranges: {
    flexDirection: 'row',
    gap: 8,
  },
  range: {
    flex: 1,
    height: 44,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: Brand.surface,
    fontSize: 17,
    fontWeight: '600',
    color: Brand.text,
    outlineWidth: 0,
  },
}));
