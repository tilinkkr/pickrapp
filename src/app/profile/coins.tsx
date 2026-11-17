import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PickrTruck } from '@/components/brand/pickr-truck';
import { ProfilePage } from '@/components/profile/settings';
import { CheckCircle2, Gift, type LucideIcon, Timer, Truck } from '@/components/ui/icons';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { enterAt, STAGGER_MS } from '@/lib/motion';
import { useSession } from '@/lib/session';
import { useTrips } from '@/lib/trips';

const PER_TRIP = 20;

/**
 * Pickr coins: an orange hero with the logo truck and a still coin with small
 * coins rising past it, the balance (20 per paid trip, demo until the pilot ends), then the
 * three ways to earn. Coins cannot be spent yet (handoff section 11).
 */
export default function CoinsScreen() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  const { trips } = useTrips();
  const coins = trips.filter((trip) => trip.paid).length * PER_TRIP;

  const ways: { icon: LucideIcon; label: string }[] = [
    { icon: CheckCircle2, label: t('coinsTrip') },
    { icon: Timer, label: t('coinsOnTime') },
    { icon: Gift, label: t('coinsRefer') },
  ];

  return (
    <ProfilePage title={t('pickrCoins')}>
      <Animated.View entering={enterAt()} style={styles.hero}>
        <View style={styles.truck}>
          <PickrTruck width={150} color="#FFFFFF" withSpeedLines />
        </View>
        <View style={styles.coinRow}>
          <SpinningCoin />
          <SmallCoin delay={500} style={styles.small1} />
          <SmallCoin delay={1100} style={styles.small2} />
        </View>
        <Text style={styles.balance}>{t('coinsBalance', { n: coins })}</Text>
        <Text style={styles.earned}>{t('coinsEarned')}</Text>
      </Animated.View>

      <View>
        <Text style={styles.section}>{t('coinsEarn')}</Text>
        <View style={styles.group}>
          {ways.map((way, i) => (
            <Animated.View
              key={way.label}
              entering={enterAt(0, STAGGER_MS * (1 + i))}
              style={[styles.row, i < ways.length - 1 && styles.divider]}>
              <View style={styles.rowIcon}>
                <way.icon size={20} color={Brand.link} strokeWidth={2.25} />
              </View>
              <Text style={styles.rowText}>{way.label}</Text>
            </Animated.View>
          ))}
        </View>
      </View>

      <View style={styles.note}>
        <Truck size={18} color={Brand.link} strokeWidth={2.25} />
        <Text style={styles.noteText}>{t('coinsSoon')}</Text>
      </View>
    </ProfilePage>
  );
}

/** The coin holds still (no spinning or bobbing, 2026-11-11); the small coins around it do the moving. */
function SpinningCoin() {
  const styles = useStyles();
  return (
    <View style={styles.coin}>
      <View style={styles.coinInner}>
        <Text style={styles.coinMark}>P</Text>
      </View>
    </View>
  );
}

/** A small coin that rises and fades on a loop, like coins popping out. */
function SmallCoin({ delay, style: position }: { delay: number; style: object }) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const rise = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    rise.set(withDelay(delay, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1)));
  }, [reduced, delay, rise]);

  const style = useAnimatedStyle(() => ({
    opacity: reduced ? 0.9 : 1 - rise.value,
    transform: [{ translateY: -rise.value * 36 }, { scale: 0.7 + rise.value * 0.3 }],
  }));

  return <Animated.View style={[styles.smallCoin, position, style]} />;
}

const COIN = 84;

const useStyles = makeStyles((Brand) => ({
  hero: {
    paddingTop: 20,
    paddingBottom: 22,
    borderRadius: 28,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    overflow: 'hidden',
  },
  truck: {
    opacity: 0.95,
  },
  coinRow: {
    height: COIN + 16,
    marginTop: 8,
    width: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coin: {
    width: COIN,
    height: COIN,
    borderRadius: COIN / 2,
    backgroundColor: '#FDBA74',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInner: {
    width: COIN - 22,
    height: COIN - 22,
    borderRadius: (COIN - 22) / 2,
    borderWidth: 2,
    borderColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinMark: {
    fontSize: 30,
    fontWeight: '900',
    color: '#9A3412',
  },
  smallCoin: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FED7AA',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  small1: {
    left: 28,
    bottom: 18,
  },
  small2: {
    right: 30,
    bottom: 26,
  },
  balance: {
    marginTop: 10,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Brand.onPrimary,
    fontVariant: ['tabular-nums'],
  },
  earned: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.onPrimary,
    opacity: 0.75,
  },
  section: {
    marginBottom: 12,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: Brand.text,
  },
  group: {
    borderRadius: 20,
    backgroundColor: Brand.surface,
    overflow: 'hidden',
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Brand.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Brand.text,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Brand.selected,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Brand.text,
  },
}));
