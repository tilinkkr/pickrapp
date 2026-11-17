import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { ProfilePage } from '@/components/profile/settings';
import { Clock, Handshake, type LucideIcon, ShieldCheck, Star, UserRoundCheck } from '@/components/ui/icons';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { enterAt, STAGGER_MS } from '@/lib/motion';
import { demoRating } from '@/lib/rating';
import { useSession } from '@/lib/session';
import { useTrips } from '@/lib/trips';

const HERO = require('@/assets/images/profile/rating.webp');
const PILL_FROM = 150;

/**
 * My rating: an illustration, the rating large in the centre (it stays
 * centred in a pill at the top once you scroll), how it is calculated, and
 * the four things drivers rate, as equal icon tiles.
 */
export default function RatingScreen() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  const { trips } = useTrips();
  const scrollY = useSharedValue(0);
  const rated = trips.filter((trip) => trip.paid).length;
  const rating = demoRating(rated);

  const pillStyle = useAnimatedStyle(() => {
    const shown = interpolate(scrollY.value, [PILL_FROM, PILL_FROM + 40], [0, 1], 'clamp');
    return { opacity: shown, transform: [{ translateY: (1 - shown) * -8 }, { scale: 0.9 + shown * 0.1 }] };
  });

  const tiles: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: UserRoundCheck, title: t('rateKnowDriver'), body: t('rateKnowDriverBody') },
    { icon: Clock, title: t('rateTimely'), body: t('rateTimelyBody') },
    { icon: ShieldCheck, title: t('rateSafety'), body: t('rateSafetyBody') },
    { icon: Handshake, title: t('rateCourtesy'), body: t('rateCourtesyBody') },
  ];

  return (
    <ProfilePage
      title={t('myRating')}
      scrollY={scrollY}
      overlay={
        <Animated.View pointerEvents="none" style={[styles.pillWrap, pillStyle]}>
          <View style={styles.pill}>
            <Star size={16} color={Brand.primary} fill={Brand.primary} strokeWidth={2} />
            <Text style={styles.pillText}>{rating.toFixed(2)}</Text>
          </View>
        </Animated.View>
      }>
      <Animated.View entering={enterAt()}>
        <Image source={HERO} style={styles.hero} contentFit="cover" accessibilityIgnoresInvertColors />
      </Animated.View>

      <Animated.View entering={enterAt(0, STAGGER_MS)} style={styles.center}>
        <Text style={styles.big} accessibilityRole="header">
          {rating.toFixed(2)}
        </Text>
        <View style={styles.stars} accessibilityLabel={`${rating} / 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={22} color={Brand.primary} fill={n <= Math.round(rating) ? Brand.primary : 'none'} strokeWidth={2} />
          ))}
        </View>
        <Text style={styles.based}>{t('ratingBased', { n: Math.max(rated, 0) })}</Text>
        <Text style={styles.demo}>{t('ratingDemo')}</Text>
      </Animated.View>

      <Animated.View entering={enterAt(0, STAGGER_MS * 2)} style={styles.how}>
        <Text style={styles.howTitle}>{t('ratingHowTitle')}</Text>
        <Text style={styles.howBody}>{t('ratingHowBody')}</Text>
      </Animated.View>

      <View>
        <Text style={styles.section}>{t('understandRatings')}</Text>
        <View style={styles.grid}>
          {tiles.map((tile, i) => (
            <Animated.View key={tile.title} entering={enterAt(0, STAGGER_MS * (3 + i))} style={styles.tile}>
              <View style={styles.tileIcon}>
                <tile.icon size={22} color={Brand.link} strokeWidth={2.25} />
              </View>
              <Text style={styles.tileTitle} numberOfLines={1}>
                {tile.title}
              </Text>
              <Text style={styles.tileBody} numberOfLines={3}>
                {tile.body}
              </Text>
            </Animated.View>
          ))}
        </View>
      </View>
    </ProfilePage>
  );
}

const useStyles = makeStyles((Brand) => ({
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 20,
    backgroundColor: Brand.selected,
  },
  center: {
    alignItems: 'center',
    gap: 6,
  },
  big: {
    fontSize: 52,
    lineHeight: 58,
    fontWeight: '800',
    letterSpacing: -1,
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  stars: {
    flexDirection: 'row',
    gap: 6,
  },
  based: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: Brand.text,
  },
  demo: {
    fontSize: 12,
    color: Brand.muted,
  },
  how: {
    padding: 16,
    gap: 6,
    borderRadius: 20,
    backgroundColor: Brand.selected,
  },
  howTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.text,
  },
  howBody: {
    fontSize: 14,
    lineHeight: 20,
    color: Brand.text,
  },
  section: {
    marginBottom: 12,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: Brand.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  // Four equal tiles: icon, title, one short line.
  tile: {
    flexBasis: '40%',
    flexGrow: 1,
    height: 148,
    padding: 14,
    gap: 6,
    borderRadius: 20,
    backgroundColor: Brand.surface,
  },
  tileIcon: {
    width: 44,
    height: 44,
    marginBottom: 4,
    borderRadius: 14,
    backgroundColor: Brand.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.text,
  },
  tileBody: {
    fontSize: 12,
    lineHeight: 16,
    color: Brand.muted,
  },
  pillWrap: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Brand.card,
    borderWidth: 1,
    borderColor: Brand.border,
    shadowColor: '#7C2D12',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pillText: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
}));
