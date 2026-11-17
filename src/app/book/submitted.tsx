import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BookingLayout } from '@/components/booking/booking-layout';
import { EmptyState } from '@/components/trips/empty-state';
import { CalendarClock, Check, FileText, Route, Truck } from '@/components/ui/icons';
import { PrimaryButton } from '@/components/ui/primary-button';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { useSession } from '@/lib/session';
import { formatRupees, formatWhen } from '@/lib/trip-format';
import { useTrips } from '@/lib/trips';
import { enterAt, popIn } from '@/lib/motion';

/**
 * Confirmation after "Submit request". The booking flow is finished, so back
 * goes Home rather than into the submitted form.
 */
export default function SubmittedScreen() {
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useSession();
  const { trips } = useTrips();
  const trip = trips.find((x) => x.id === id);

  const goHome = useCallback(() => {
    if (router.canDismiss()) router.dismissAll();
    router.navigate('/');
  }, []);

  const goToRequests = () => {
    if (router.canDismiss()) router.dismissAll();
    router.navigate('/requests');
  };

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome])
  );

  if (!trip) {
    return (
      <BookingLayout title={t('submitted')} onBack={goHome}>
        <EmptyState icon={FileText} title={t('notFound')} />
      </BookingLayout>
    );
  }

  const scheduled = trip.stage === 'scheduled';

  return (
    <BookingLayout
      title={t('submitted')}
      showBack={false}
      footer={
        <View style={styles.footer}>
          <PrimaryButton label={t('viewRequest')} icon={FileText} onPress={goToRequests} />
          <PrimaryButton variant="outline" label={t('backToHome')} onPress={goHome} />
        </View>
      }>
      <View style={styles.hero}>
        <Animated.View entering={popIn()} style={styles.check}>
          <Check size={44} color="#FFFFFF" strokeWidth={3} />
        </Animated.View>
        <Animated.View entering={enterAt(0, 150)} style={styles.heroText}>
          <Text style={styles.title} accessibilityRole="header">
            {t('submitted')}
          </Text>
          <Text style={styles.body}>
            {scheduled
              ? t('submittedScheduled', { date: formatWhen(language, trip.when) })
              : t('submittedSearching')}
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={enterAt(0, 250)} style={styles.details}>
        <View style={styles.codeRow}>
          <Text style={styles.codeLabel}>{t('tripCode')}</Text>
          <Text style={styles.code}>{trip.code}</Text>
        </View>
        <View style={styles.divider} />
        <Row icon={Truck}>
          {trip.material} · {trip.quantity} · {trip.vehicle}
        </Row>
        <Row icon={Route}>
          {trip.pickup} → {trip.delivery}
        </Row>
        <Row icon={CalendarClock}>
          {scheduled ? t('pickupAt', { date: formatWhen(language, trip.when) }) : t('asap')}
        </Row>
        {trip.estimate && (
          <Text style={styles.estimate}>
            {t('estimateRange', { low: formatRupees(trip.estimate.low), high: formatRupees(trip.estimate.high) })}
          </Text>
        )}
        <Text style={styles.note}>{t('payDriver')}</Text>
      </Animated.View>
    </BookingLayout>
  );
}

function Row({ icon: Icon, children }: { icon: typeof Truck; children: React.ReactNode }) {
  const Brand = useBrand();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Icon size={20} color={Brand.muted} strokeWidth={2} />
      <Text style={styles.rowText}>{children}</Text>
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  hero: {
    alignItems: 'center',
    paddingTop: 12,
    gap: 18,
  },
  check: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: Brand.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700',
    color: Brand.text,
    textAlign: 'center',
  },
  body: {
    maxWidth: 340,
    fontSize: 17,
    lineHeight: 25,
    color: Brand.text,
    textAlign: 'center',
  },
  details: {
    marginTop: 28,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    gap: 12,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Brand.muted,
  },
  code: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Brand.text,
  },
  divider: {
    height: 1,
    backgroundColor: Brand.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rowText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 23,
    color: Brand.text,
  },
  estimate: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '700',
    color: Brand.text,
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
    color: Brand.muted,
  },
  footer: {
    gap: 10,
  },
}));
