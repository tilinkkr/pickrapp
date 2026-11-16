import { Pressable, Text } from 'react-native';

import { tapHaptic } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import { canSimulate, simulateNext } from '@/lib/simulate';
import { photosDone } from '@/lib/trip-machine';
import { type Trip, useTrips } from '@/lib/trips';
import { makeStyles } from '@/lib/app-theme';

/**
 * Development-only control that plays the driver's part (accept, arrive,
 * load, deliver, confirm payment) until the driver app exists.
 */
export function SimStrip({ trip }: { trip: Trip }) {
  const styles = useStyles();
  const { t } = useSession();
  const { dispatch } = useTrips();
  if (!__DEV__ || !canSimulate(trip)) return null;

  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        dispatch(trip.id, simulateNext);
      }}
      accessibilityRole="button"
      style={({ pressed }) => [styles.strip, pressed && styles.pressed]}>
      <Text style={styles.kicker}>{t('demoControls')}</Text>
      <Text style={styles.label}>
        {trip.stage === 'loading' && !photosDone(trip) ? t('simPhoto') : t(`sim_${trip.stage}` as 'sim_searching')} →
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((Brand) => ({
  strip: {
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: '#E2E8F0',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#64748B',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
}));
