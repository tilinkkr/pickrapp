import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { GlassCard, GlassCell, GlassRow } from '@/components/ui/glass';
import { Home, Share2 } from '@/components/ui/icons';
import { IconChip } from '@/components/ui/m-icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { makeStyles } from '@/lib/app-theme';
import { tripFare } from '@/lib/fare';
import { enterAt, STAGGER_MS } from '@/lib/motion';
import { useSession } from '@/lib/session';
import { formatRupees, formatWhen } from '@/lib/trip-format';
import type { Trip } from '@/lib/trips';

const rise = (row: number) =>
  enterAt(0, row * STAGGER_MS * 1.5);
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
/** Paper is always paper: white with dark ink, in light and dark mode alike. */
const PAPER = '#FFFFFF';
const INK = '#1C1917';
const INK_SOFT = '#78716C';
const PRINT_MS = 1100;
const TEETH = 18;

/**
 * Paid (C19). Shown only after the driver has recorded payment, never just
 * because work finished. A short "payment received" grid, then the receipt
 * prints out of a slot: white paper, dashed rules, a torn edge, few words.
 */
export function ReceiptView({ trip }: { trip: Trip }) {
  const styles = useStyles();
  const { t, language } = useSession();
  const reduced = useReducedMotion();
  const fare = tripFare(trip);
  const amount = trip.amount ?? fare.total;
  const waiting = fare.lines.find((line) => line.key === 'waiting')?.amount ?? 0;
  const method = trip.paymentMethod === 'cash' ? t('cash') : t('upi');
  const paidAt = trip.paidAt ? formatWhen(language, trip.paidAt) : '—';

  // The paper slides down out of the slot once its height is known.
  const height = useSharedValue(0);
  const [measured, setMeasured] = useState(0);
  const print = useSharedValue(reduced ? 1 : 0);
  const paperStyle = useAnimatedStyle(() => ({
    opacity: height.value > 0 ? 1 : 0,
    transform: [{ translateY: -(1 - print.value) * height.value }],
  }));

  useEffect(() => {
    if (!measured) return;
    height.set(measured);
    if (!reduced) print.set(withDelay(250, withTiming(1, { duration: PRINT_MS, easing: Easing.out(Easing.cubic) })));
  }, [measured, reduced, height, print]);

  function share() {
    const text = [
      `PICKR ${t('receipt')} · ${trip.code}`,
      `₹${formatRupees(amount)} · ${t('paid')} · ${method}`,
      `${trip.pickup} → ${trip.delivery}`,
    ].join('\n');
    Share.share({ message: text }).catch(() => {});
  }

  return (
    <View>
      <Animated.View entering={rise(0)} style={styles.head}>
        <IconChip name="check-circle" size={46} tone="solid" />
        <View style={styles.flex}>
          <Text style={styles.kicker}>{t('paid')}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {t('paymentReceived')}
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={rise(1)} style={styles.block}>
        <GlassCard>
          <GlassRow divided={false}>
            <GlassCell icon="cash-check" value={`₹${formatRupees(amount)}`} label={t('paid')} />
            <GlassCell divided icon={trip.paymentMethod === 'cash' ? 'cash' : 'cellphone-check'} value={method} label={t('paidWith')} />
          </GlassRow>
          <GlassRow>
            <GlassCell icon="clock-check-outline" value={paidAt} label={t('paidAtLabel')} />
          </GlassRow>
        </GlassCard>
      </Animated.View>

      {/* The printer: a dark slot the paper feeds out of. */}
      <Animated.View entering={rise(2)} style={styles.printer}>
        <View style={styles.slot} />
        <View style={styles.clip}>
          <Animated.View style={paperStyle}>
            <View
              onLayout={(e) => {
                if (!measured) setMeasured(e.nativeEvent.layout.height);
              }}
              style={styles.paper}
              accessible
              accessibilityLabel={`${t('receipt')} ${trip.code}. ${t('total')} ₹${formatRupees(amount)}. ${t('paid')} ${method}.`}
            >
              <Text style={styles.brand}>PICKR</Text>
              <Text style={styles.meta}>
                {trip.code} · {paidAt}
              </Text>
              <Rule />
              <Line label={t('transportLabel')} value={`₹${formatRupees(amount - waiting)}`} />
              {waiting > 0 && <Line label={t('fareWaiting')} value={`₹${formatRupees(waiting)}`} />}
              <Rule />
              <Line label={t('total')} value={`₹${formatRupees(amount)}`} strong />
              <Text style={styles.paidStamp}>
                {t('paid')} · {method}
              </Text>
              <Rule />
              <Text style={styles.foot}>{t('materialNotIncludedShort')}</Text>
              <View style={styles.teeth}>
                {Array.from({ length: TEETH }, (_, i) => (
                  <View key={i} style={styles.tooth} />
                ))}
              </View>
            </View>
          </Animated.View>
        </View>
      </Animated.View>

      <View style={styles.actions}>
        <PrimaryButton label={t('shareReceipt')} icon={Share2} onPress={share} />
        <PrimaryButton variant="outline" label={t('backToHome')} icon={Home} onPress={() => router.navigate('/')} />
      </View>
    </View>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, strong && styles.lineStrong]}>{label}</Text>
      <Text style={[styles.lineValue, strong && styles.lineStrong]}>{value}</Text>
    </View>
  );
}

/** A dashed rule, like a till receipt. */
function Rule() {
  const styles = useStyles();
  return <View style={styles.rule} />;
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
    color: Brand.success,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Brand.text,
  },
  block: {
    marginTop: 16,
  },
  printer: {
    marginTop: 20,
    alignItems: 'center',
  },
  slot: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    backgroundColor: Brand.text,
    opacity: 0.85,
  },
  // The paper is clipped just under the slot so it appears to feed out of it.
  clip: {
    width: '90%',
    marginTop: -6,
    overflow: 'hidden',
    paddingBottom: 6,
  },
  paper: {
    paddingTop: 22,
    paddingHorizontal: 18,
    paddingBottom: 22,
    backgroundColor: PAPER,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  brand: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 5,
    color: INK,
    textAlign: 'center',
  },
  meta: {
    marginTop: 4,
    fontFamily: MONO,
    fontSize: 11,
    color: INK_SOFT,
    textAlign: 'center',
  },
  rule: {
    marginVertical: 12,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D6D3D1',
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  lineLabel: {
    fontFamily: MONO,
    fontSize: 13,
    color: INK_SOFT,
  },
  lineValue: {
    fontFamily: MONO,
    fontSize: 13,
    color: INK,
  },
  lineStrong: {
    fontSize: 17,
    fontWeight: '800',
    color: INK,
  },
  paidStamp: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#15803D',
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#15803D',
  },
  foot: {
    fontSize: 11,
    color: INK_SOFT,
    textAlign: 'center',
  },
  // A torn edge: squares turned 45° in the page colour bite into the paper's bottom.
  teeth: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -7,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tooth: {
    width: 12,
    height: 12,
    backgroundColor: Brand.card,
    transform: [{ rotate: '45deg' }],
  },
  actions: {
    marginTop: 18,
    gap: 10,
  },
}));
