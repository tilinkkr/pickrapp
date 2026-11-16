import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOutUp, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { MIcon } from '@/components/ui/m-icon';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { shortVehicleName } from '@/lib/booking-format';
import { useSession } from '@/lib/session';
import { searchStart } from '@/lib/trip-machine';
import { SEARCH_MS } from '@/lib/trip-runner';
import type { Trip } from '@/lib/trips';

const STATUS_MS = 3200;

type SearchingViewProps = {
  trip: Trip;
  now: number;
  onCancel: () => void;
};

/**
 * Finding a truck (C12), ride-app simple: a centred title with one rolling
 * status line, one progress bar for the five-minute search (rule 6), one
 * card saying what was booked and where to meet, and a quiet free cancel.
 * Nothing about the driver appears until one has accepted.
 */
export function SearchingView({ trip, now, onCancel }: SearchingViewProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  const share = Math.min(1, Math.max(0, now - searchStart(trip)) / SEARCH_MS);

  const messages = [t('contactingDriversNear', { truck: shortVehicleName(trip.vehicle), place: trip.pickup.split(',')[0].trim() }), t('stepChecking'), t('stepConfirming')];
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % messages.length), STATUS_MS);
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <View>
      <Text style={styles.title} accessibilityRole="header">
        {t('searchingTitle')}
      </Text>
      <View style={styles.statusBox} accessibilityLiveRegion="polite">
        <Animated.Text key={index} entering={FadeInDown.duration(300)} exiting={FadeOutUp.duration(200)} style={styles.status} numberOfLines={1}>
          {messages[index]}
        </Animated.Text>
      </View>

      <Progress share={share} />

      <View style={styles.card}>
        <Text style={styles.kicker}>
          {shortVehicleName(trip.vehicle)} · {trip.material} · {trip.quantity.split(' · ')[0]}
        </Text>
        <Text style={styles.meet}>{t('meetAt', { place: trip.pickup })}</Text>
        <View style={styles.pay}>
          <MIcon name="cash" size={16} color={Brand.link} />
          <Text style={styles.payText}>{t('payDriverChip')}</Text>
        </View>
      </View>

      <Pressable onPress={onCancel} accessibilityRole="button" hitSlop={6} style={styles.cancel}>
        <Text style={styles.cancelText}>{t('cancelBooking')}</Text>
        <Text style={styles.cancelNote}>{t('cancelFreeShort')}</Text>
      </Pressable>
    </View>
  );
}

/** The search's real progress, with a soft highlight gliding along the filled part. */
function Progress({ share }: { share: number }) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const glide = useSharedValue(0);
  useEffect(() => {
    if (!reduced) glide.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.cubic) }), -1));
  }, [reduced, glide]);
  const shine = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - Math.abs(glide.value - 0.5) * 2), left: `${glide.value * 100}%` }));
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(share * 100) }}>
      <View style={[styles.fill, { width: `${Math.max(4, share * 100)}%` }]}>
        <Animated.View style={[styles.shine, shine]} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Brand.text,
    textAlign: 'center',
  },
  statusBox: {
    height: 24,
    marginTop: 4,
    justifyContent: 'center',
  },
  status: {
    fontSize: 15,
    fontWeight: '600',
    color: Brand.muted,
    textAlign: 'center',
  },
  track: {
    marginTop: 14,
    height: 5,
    borderRadius: 3,
    backgroundColor: Brand.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Brand.primary,
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 40,
    marginLeft: -20,
    backgroundColor: '#FFFFFF',
  },
  card: {
    marginTop: 18,
    padding: 16,
    gap: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.muted,
  },
  meet: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
    color: Brand.text,
  },
  pay: {
    marginTop: 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Brand.selected,
  },
  payText: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.link,
  },
  cancel: {
    marginTop: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.danger,
  },
  cancelNote: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.muted,
  },
}));
