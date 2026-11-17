import { ScrollView, Text } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { GlassCard, InfoRow } from '@/components/ui/glass';
import { makeStyles } from '@/lib/app-theme';
import { shortVehicleName } from '@/lib/booking-format';
import { waitRate } from '@/lib/fare';
import { firstName, meetsText, personLine } from '@/lib/people';
import { useSession } from '@/lib/session';
import { formatDay, formatRupees, formatTime } from '@/lib/trip-format';
import type { Trip } from '@/lib/trips';

type TripDetailsSheetProps = { trip: Trip; visible: boolean; onClose: () => void };

/**
 * Everything about the booking that the live page leaves out, one tap away.
 * Three titled grids, in the order people look for them: the route, the load
 * and truck, the money. Each row has the same icon column, so labels and
 * values line up down the sheet.
 */
export function TripDetailsSheet({ trip, visible, onClose }: TripDetailsSheetProps) {
  const styles = useStyles();
  const { t, language } = useSession();
  const amount = trip.amount ?? trip.quote;

  return (
    <BottomSheet visible={visible} title={`${t('tripDetails')} · ${trip.code}`} closeLabel={t('close')} onClose={onClose}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>{t('routeLabel')}</Text>
        <GlassCard>
          <InfoRow icon="circle-outline" label={t('pickupLabel')} value={trip.pickup} />
          <InfoRow divided icon="flag-checkered" label={t('dropLabel')} value={trip.delivery} />
          <InfoRow divided icon="calendar-blank-outline" label={t('bookedAt')} value={`${formatDay(language, trip.when)} · ${formatTime(language, trip.when)}`} />
          {trip.forOther && (
            <InfoRow
              divided
              icon="account-arrow-right-outline"
              label={`${t('bookedFor')} · ${meetsText(t, trip.forOther.meets)}`}
              value={personLine(trip.forOther)}
            />
          )}
        </GlassCard>

        <Text style={styles.section}>{t('tripLoad')}</Text>
        <GlassCard>
          <InfoRow icon="package-variant-closed" label={t('loadLabel')} value={`${trip.material} · ${trip.quantity}`} />
          <InfoRow divided icon="truck-outline" label={t('truckLabel')} value={shortVehicleName(trip.vehicle) + (trip.registration ? ` · ${trip.registration}` : '')} />
          {trip.driver && <InfoRow divided icon="account-hard-hat-outline" label={t('driverLabel')} value={trip.driver.name} />}
          {trip.transitPass && <InfoRow divided icon="file-document-outline" label={t('truckPass')} value={trip.transitPass} />}
          {trip.notes && <InfoRow divided icon="note-text-outline" label={t('notesShort')} value={trip.notes} />}
        </GlassCard>

        <Text style={styles.section}>{t('fareDetails')}</Text>
        <GlassCard accent>
          {amount != null && <InfoRow icon="cash" label={t('fixedFare')} value={`₹${formatRupees(amount)}`} />}
          <InfoRow divided={amount != null} icon="timer-sand" label={t('loadingUnloading')} value={`${t('thirtyMinFree')} · ₹${waitRate(trip.vehicle)}/${t('minUnit')}`} />
          <InfoRow divided icon="information-outline" label={t('materialCost')} value={t('notIncluded')} />
        </GlassCard>
        <Text style={styles.pay}>
          {trip.forOther?.pays === 'them' ? t('theyPayDriver', { name: firstName(trip.forOther.name) }) : t('payDriver')}
        </Text>
      </ScrollView>
    </BottomSheet>
  );
}

const useStyles = makeStyles((Brand) => ({
  scroll: {
    maxHeight: 520,
  },
  content: {
    paddingBottom: 8,
  },
  section: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: Brand.muted,
  },
  pay: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: Brand.muted,
  },
}));
