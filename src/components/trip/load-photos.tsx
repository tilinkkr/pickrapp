import { Image, type ImageProps } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, ZoomIn } from 'react-native-reanimated';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { MIcon } from '@/components/ui/m-icon';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { photoSource, REQUIRED_PHOTOS } from '@/lib/load-photos';
import { useSession } from '@/lib/session';
import type { Trip } from '@/lib/trips';

/**
 * The driver's load photos as the customer sees them (D10 → C15/C16).
 * While loading: two slots that wait for the driver, then fill as each upload
 * is acknowledged. On the way: the photos themselves. Tap one to see it large.
 * Skipped photos (pilot setting) are stated plainly, never hidden (rule 13).
 */
export function LoadPhotos({ trip }: { trip: Trip }) {
  const styles = useStyles();
  const { t } = useSession();
  const [open, setOpen] = useState<string | null>(null);
  const photos = trip.loadPhotos ?? [];
  const loading = trip.stage === 'loading';
  const slots = loading ? Math.max(REQUIRED_PHOTOS, photos.length) : photos.length;

  if (!loading && photos.length === 0) {
    return trip.photosSkipped ? <Text style={styles.skipped}>{t('photosSkipped')}</Text> : null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>{t('loadPhotos')}</Text>
        <Text style={[styles.count, photos.length >= REQUIRED_PHOTOS && styles.countDone]}>
          {loading ? t('photosOf', { n: Math.min(photos.length, REQUIRED_PHOTOS), total: REQUIRED_PHOTOS }) : t('photosCount', { n: photos.length })}
        </Text>
      </View>
      <View style={styles.row}>
        {Array.from({ length: Math.min(slots, 4) }, (_, i) => {
          const key = photos[i];
          return key ? (
            <Animated.View key={key} entering={ZoomIn.duration(260).easing(Easing.out(Easing.cubic))} style={styles.cell}>
              <Pressable onPress={() => setOpen(key)} accessibilityRole="imagebutton" accessibilityLabel={`${t('loadPhotos')} ${i + 1}`}>
                <Image source={photoSource(key) as ImageProps['source']} style={styles.photo} contentFit="cover" transition={200} />
                <View style={styles.badge}>
                  <MIcon name="check" size={12} color="#FFFFFF" />
                </View>
              </Pressable>
            </Animated.View>
          ) : (
            <View key={`slot-${i}`} style={styles.cell}>
              <WaitingSlot />
            </View>
          );
        })}
      </View>

      <BottomSheet visible={open !== null} title={t('loadPhotos')} closeLabel={t('close')} onClose={() => setOpen(null)}>
        {open && <Image source={photoSource(open) as ImageProps['source']} style={styles.large} contentFit="contain" />}
      </BottomSheet>
    </View>
  );
}

/** An empty slot that gently breathes while the driver takes the photo. No movement, only light. */
function WaitingSlot() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);
  useEffect(() => {
    if (!reduced) glow.set(withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduced, glow]);
  const style = useAnimatedStyle(() => ({ opacity: 0.55 + glow.value * 0.45 }));
  return (
    <Animated.View entering={FadeIn.duration(200)} style={[styles.photo, styles.empty, style]}>
      <MIcon name="camera-outline" size={22} color={Brand.link} />
      <Text style={styles.wait}>{t('waitingDriver')}</Text>
    </Animated.View>
  );
}

const useStyles = makeStyles((Brand) => ({
  // A grid like the others on the page: outlined, 16 px inset.
  wrap: {
    padding: 16,
    gap: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.text,
  },
  count: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.muted,
    fontVariant: ['tabular-nums'],
  },
  countDone: {
    color: Brand.success,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  cell: {
    flex: 1,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    backgroundColor: Brand.surface,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Brand.primary,
    backgroundColor: Brand.selected,
  },
  wait: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.link,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Brand.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
  },
  skipped: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: Brand.warning,
  },
}));
