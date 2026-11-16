import { router } from 'expo-router';
import { Text, View } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';

import { ScreenTitle, TabScreen } from '@/components/tab-screen';
import { EmptyState } from '@/components/trips/empty-state';
import { ChevronRight, FileText } from '@/components/ui/icons';
import { IconChip, type MIconName } from '@/components/ui/m-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { selectionHaptic } from '@/lib/haptics';
import { STAGGER_MS } from '@/lib/motion';
import { useSession } from '@/lib/session';
import { formatDay, formatTime } from '@/lib/trip-format';
import { type Trip, useTrips } from '@/lib/trips';

const isPending = (trip: Trip) => trip.stage === 'scheduled' || trip.stage === 'searching';
const isFailed = (trip: Trip) => trip.stage === 'cancelled' || trip.stage === 'no_driver';

/**
 * Requests (agreed 2026-11-03): bookings without a truck yet (C11 scheduled,
 * C12 searching) and the ones that ended without one (cancelled, no truck
 * found), which are marked in red. Compact rows: what, when, one status.
 * Wording never promises a driver before one accepts.
 */
export default function RequestsScreen() {
  const styles = useStyles();
  const { t } = useSession();
  const { trips, demoActive } = useTrips();
  const pending = trips.filter(isPending);
  const failed = trips.filter(isFailed);

  return (
    <TabScreen>
      <ScreenTitle>{t('requestsTitle')}</ScreenTitle>

      {pending.length === 0 && failed.length === 0 && <EmptyState icon={FileText} title={t('noRequests')} body={t('noRequestsSub')} />}

      {pending.length > 0 && (
        <Section title={t('pendingRequests')} count={pending.length}>
          {pending.map((trip, i) => (
            <RequestRow key={trip.id} trip={trip} index={i} last={i === pending.length - 1} />
          ))}
        </Section>
      )}

      {failed.length > 0 && (
        <Section title={t('closedRequests')} count={failed.length}>
          {failed.map((trip, i) => (
            <RequestRow key={trip.id} trip={trip} index={i} last={i === failed.length - 1} />
          ))}
        </Section>
      )}

      {__DEV__ && demoActive && <Text style={styles.demo}>{t('demoData')}</Text>}
    </TabScreen>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.count}>{count}</Text>
      </View>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

const ICON: Record<string, MIconName> = {
  scheduled: 'calendar-clock',
  searching: 'radar',
  cancelled: 'close-circle-outline',
  no_driver: 'magnify-close',
};

function RequestRow({ trip, index, last }: { trip: Trip; index: number; last: boolean }) {
  const Brand = useBrand();
  const styles = useStyles();
  const { t, language } = useSession();
  const failed = isFailed(trip);

  return (
    <Animated.View entering={FadeInDown.duration(260).easing(Easing.out(Easing.cubic)).delay(index * STAGGER_MS)}>
      <PressableScale
        onPress={() => {
          selectionHaptic();
          router.push(failed ? { pathname: '/loads/[id]', params: { id: trip.id } } : { pathname: '/trip/[id]', params: { id: trip.id } });
        }}
        accessibilityRole="button"
        accessibilityLabel={`${trip.material}, ${t(`stage_${trip.stage}`)}`}
        style={[styles.row, !last && styles.divider]}>
        <IconChip name={ICON[trip.stage] ?? 'radar'} size={40} tone={failed ? 'danger' : 'brand'} />
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={1}>
            {trip.material} · {trip.quantity.split(' · ')[0]}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {trip.delivery.split(',')[0]} · {formatDay(language, trip.when)}, {formatTime(language, trip.when)}
          </Text>
        </View>
        <Text style={[styles.status, failed && styles.statusFailed]}>{t(`short_${trip.stage}` as 'short_searching')}</Text>
        <ChevronRight size={18} color={Brand.muted} strokeWidth={2.25} />
      </PressableScale>
    </Animated.View>
  );
}

const useStyles = makeStyles((Brand) => ({
  flex: {
    flex: 1,
  },
  section: {
    marginTop: 20,
  },
  sectionHead: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.text,
  },
  count: {
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
  group: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
    overflow: 'hidden',
  },
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 10,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.text,
  },
  sub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: Brand.muted,
  },
  status: {
    fontSize: 12,
    fontWeight: '800',
    color: Brand.link,
  },
  statusFailed: {
    color: Brand.danger,
  },
  demo: {
    marginTop: 16,
    fontSize: 12,
    textAlign: 'center',
    color: Brand.muted,
  },
}));
