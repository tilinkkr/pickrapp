import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { GlassCard } from '@/components/ui/glass';
import { IconChip, MIcon, type MIconName } from '@/components/ui/m-icon';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { tripFare } from '@/lib/fare';
import { selectionHaptic } from '@/lib/haptics';
import { enterAt, STAGGER_MS } from '@/lib/motion';
import { firstName } from '@/lib/people';
import { type PayMethod, useSession } from '@/lib/session';
import { formatRupees } from '@/lib/trip-format';
import { type Trip, useTrips } from '@/lib/trips';

const rise = (row: number) => enterAt(0, row * STAGGER_MS * 1.5);

const METHODS: { value: PayMethod; icon: MIconName; label: 'payGpay' | 'payWhatsapp' | 'payCash' }[] = [
  { value: 'gpay', icon: 'google', label: 'payGpay' },
  { value: 'whatsapp', icon: 'whatsapp', label: 'payWhatsapp' },
  { value: 'cash', icon: 'cash', label: 'payCash' },
];

/**
 * Trip completed, payment due (C18). "Delivered" up top in orange text, the
 * amount to pay, how you'll pay the driver (UPI apps or cash, outside Pickr:
 * there is no in-app payment), and a calm wait for the driver to confirm.
 * The receipt appears only once the driver records the payment.
 */
export function DeliveredView({ trip }: { trip: Trip }) {
  const Brand = useBrand();
  const styles = useStyles();
  const { t, session } = useSession();
  const { updateTrip } = useTrips();
  const fare = tripFare(trip);
  const amount = trip.amount ?? fare.total;
  const waiting = fare.lines.find((line) => line.key === 'waiting')?.amount ?? 0;
  const driver = trip.driver?.name ?? t('theDriver');
  const method: PayMethod = trip.payPreference ?? (session?.kind === 'customer' ? session.payMethod : undefined) ?? 'cash';

  return (
    <View>
      <Animated.View entering={rise(0)} style={styles.head}>
        <IconChip name="check-circle" size={46} tone="solid" />
        <View style={styles.flex}>
          <Text style={styles.kicker}>{t('deliveredWord')}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {t('tripCompleted')}
          </Text>
        </View>
      </Animated.View>
      <Animated.Text entering={rise(0)} style={styles.address} numberOfLines={2}>
        {trip.delivery}
      </Animated.Text>

      <Animated.View entering={rise(1)} style={styles.block}>
        <GlassCard>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>
              {trip.forOther?.pays === 'them' ? t('theyPayDriver', { name: firstName(trip.forOther.name) }) : t('payDriverShort', { name: driver })}
            </Text>
            <Text style={styles.amount}>₹{formatRupees(amount)}</Text>
            {waiting > 0 && <Text style={styles.amountNote}>{t('includesWaiting', { amount: formatRupees(waiting) })}</Text>}
          </View>
          <View style={styles.methods} accessibilityRole="radiogroup">
            {METHODS.map((m, i) => {
              const on = m.value === method;
              return (
                <Pressable
                  key={m.value}
                  onPress={() => {
                    if (on) return;
                    selectionHaptic();
                    updateTrip(trip.id, { payPreference: m.value });
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={[styles.method, i > 0 && styles.methodDivider, on && styles.methodOn]}>
                  <MIcon name={m.icon} size={24} color={on ? Brand.link : Brand.muted} />
                  <Text style={[styles.methodText, on && styles.methodTextOn]} numberOfLines={1}>
                    {t(m.label)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>
      </Animated.View>

      <Animated.Text entering={rise(2)} style={styles.how}>
        {method === 'cash' ? t('payCashHow', { amount: formatRupees(amount), name: driver }) : t('payUpiHow', { amount: formatRupees(amount), name: driver })}
      </Animated.Text>

      <Animated.View entering={rise(3)} style={styles.waiting} accessibilityLiveRegion="polite">
        <Dots />
        <Text style={styles.waitingText}>{t('waitingDriverConfirm')}</Text>
      </Animated.View>
    </View>
  );
}

/** Three dots that brighten in turn: waiting, without spinning or shaking. */
function Dots() {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const phase = useSharedValue(0);
  useEffect(() => {
    if (!reduced) phase.set(withRepeat(withTiming(3, { duration: 1500, easing: Easing.linear }), -1));
  }, [reduced, phase]);
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} phase={phase} style={styles.dot} />
      ))}
    </View>
  );
}

function Dot({ index, phase, style }: { index: number; phase: SharedValue<number>; style: object }) {
  const animated = useAnimatedStyle(() => {
    const d = Math.abs(((phase.value - index + 3) % 3) - 0.5);
    return { opacity: 0.3 + Math.max(0, 1 - d) * 0.7 };
  });
  return <Animated.View style={[style, animated]} />;
}

const useStyles = makeStyles((Brand) => ({
  flex: {
    flex: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Brand.link,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Brand.text,
  },
  address: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: Brand.muted,
  },
  block: {
    marginTop: 18,
  },
  amountBox: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.muted,
  },
  amount: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '800',
    letterSpacing: -1,
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  amountNote: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.muted,
  },
  methods: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Brand.border,
  },
  method: {
    flex: 1,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  methodDivider: {
    borderLeftWidth: 1,
    borderLeftColor: Brand.border,
  },
  methodOn: {
    backgroundColor: Brand.selected,
  },
  methodText: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.muted,
  },
  methodTextOn: {
    color: Brand.text,
  },
  how: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: Brand.text,
    textAlign: 'center',
  },
  waiting: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  waitingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.muted,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Brand.primary,
  },
}));
