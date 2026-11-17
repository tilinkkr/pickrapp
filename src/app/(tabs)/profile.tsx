import { Image } from 'expo-image';
import { type Href, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { SettingsGroup, SettingsRow } from '@/components/profile/settings';
import { ScreenTitle, TabScreen } from '@/components/tab-screen';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import {
  Bell,
  Bookmark,
  ChevronRight,
  CircleHelp,
  CloudRain,
  Coins,
  FileText,
  History,
  Info,
  Languages,
  LogOut,
  MessageCircle,
  Palette,
  Shield,
  Star,
  Truck,
  User,
  Wallet,
} from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/pressable-scale';
import { PrimaryButton } from '@/components/ui/primary-button';
import { makeStyles, useAppTheme, useBrand } from '@/lib/app-theme';
import { setDemoRain, useDemoRain } from '@/lib/demo-weather';
import { choiceHaptic, selectionHaptic } from '@/lib/haptics';
import { formatIndianMobile } from '@/lib/otp';
import { demoRating } from '@/lib/rating';
import { SERVICE_STATES, setServiceStatus, useServiceStatus } from '@/lib/service-status';
import { useSession } from '@/lib/session';
import { useTrips } from '@/lib/trips';
import { enterAt } from '@/lib/motion';

/**
 * Profile hub (handoff C23), Rapido-style: identity card with the rating
 * row, then one list of everything else, most-used first. Each row opens
 * its own page; sign-out asks before it acts and is blocked during a trip.
 */
export default function ProfileScreen() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t, language, setLanguage, session, signOut } = useSession();
  const { preference } = useAppTheme();
  const { activeTrip, trips, demoActive, setDemoActive } = useTrips();
  const raining = useDemoRain();
  const service = useServiceStatus();
  const [confirmOut, setConfirmOut] = useState(false);
  const customer = session?.kind === 'customer' ? session : null;
  // Rule 11: no normal sign-out while a trip or its payment is unfinished.
  const signOutBlocked = activeTrip !== undefined;
  const paidTrips = trips.filter((trip) => trip.paid).length;
  const go = (href: Href) => () => router.push(href);
  const themeLabel = t(preference === 'dark' ? 'themeDark' : preference === 'light' ? 'themeLight' : 'themeSystem');

  return (
    <TabScreen>
      <ScreenTitle>{t('profileTitle')}</ScreenTitle>

      <Animated.View entering={enterAt()} style={styles.card}>
        <PressableScale onPress={customer ? go('/profile/account') : signOut} accessibilityRole="button" style={styles.identity}>
          {customer?.photoUri ? (
            <Image source={{ uri: customer.photoUri }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <User size={34} color={Brand.link} strokeWidth={1.75} fill={Brand.primary} fillOpacity={0.25} />
            </View>
          )}
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {customer ? customer.name ?? formatIndianMobile(customer.phone) : t('guestTitle')}
            </Text>
            <Text style={styles.phone} numberOfLines={1}>
              {customer ? formatIndianMobile(customer.phone) : t('signInToBook')}
            </Text>
          </View>
          <ChevronRight size={22} color={Brand.muted} strokeWidth={2.25} />
        </PressableScale>
        {customer && (
          <Pressable
            onPress={() => {
              selectionHaptic();
              router.push('/profile/rating');
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ratingRow, pressed && styles.pressed]}>
            <Star size={20} color={Brand.primary} fill={Brand.primary} strokeWidth={2} />
            <Text style={styles.ratingValue}>{demoRating(paidTrips).toFixed(2)}</Text>
            <Text style={[styles.ratingLabel, styles.flex]}>{t('myRating')}</Text>
            <ChevronRight size={22} color={Brand.muted} strokeWidth={2.25} />
          </Pressable>
        )}
      </Animated.View>

      {customer && !customer.whatsapp && (
        <PressableScale onPress={go('/profile/account')} accessibilityRole="button" style={styles.promo}>
          <MessageCircle size={22} color={Brand.onPrimary} strokeWidth={2.25} />
          <Text style={[styles.promoText, styles.flex]}>{t('whatsappPromo')}</Text>
          <Text style={styles.promoAction}>{t('whatsappAdd')}</Text>
        </PressableScale>
      )}

      <Animated.View entering={enterAt(0, 60)} style={styles.section}>
        <SettingsGroup>
          <SettingsRow icon={History} label={t('myRides')} onPress={go('/profile/rides')} />
          <SettingsRow icon={Wallet} label={t('payments')} onPress={go('/profile/payment')} />
          <SettingsRow icon={Coins} label={t('pickrCoins')} onPress={go('/profile/coins')} />
          <SettingsRow icon={FileText} label={t('truckPass')} onPress={go('/profile/truck-pass')} />
          <SettingsRow icon={Bell} label={t('notifications')} onPress={go('/profile/notifications')} />
          <SettingsRow icon={Bookmark} label={t('favourites')} onPress={go('/profile/favourites')} />
          <SettingsRow icon={Palette} label={t('theme')} value={themeLabel} onPress={go('/profile/theme')} />
          <SettingsRow
            icon={Languages}
            label={t('language')}
            value={language === 'en' ? 'English' : 'മലയാളം'}
            onPress={() => setLanguage(language === 'en' ? 'ml' : 'en')}
          />
          <SettingsRow icon={Shield} label={t('privacyData')} onPress={go('/profile/privacy')} />
          <SettingsRow icon={Info} label={t('about')} onPress={go('/profile/about')} />
          <SettingsRow icon={CircleHelp} label={t('help')} onPress={go('/profile/help')} last />
        </SettingsGroup>
      </Animated.View>

      {__DEV__ && (
        <View style={styles.section}>
          <SettingsGroup title={t('developer')}>
            <SettingsRow
              icon={Truck}
              label={t('demoActiveTrip')}
              trailing={<Switch value={demoActive} onValueChange={setDemoActive} trackColor={{ true: Brand.primary, false: Brand.border }} />}
            />
            <SettingsRow
              icon={CloudRain}
              label={t('demoRain')}
              trailing={<Switch value={raining} onValueChange={setDemoRain} trackColor={{ true: Brand.primary, false: Brand.border }} />}
            />
            {/* Steps through the mock service states; "Book a truck" then opens the matching page. */}
            <SettingsRow
              icon={Info}
              label={t('demoService')}
              value={service}
              onPress={() => setServiceStatus(SERVICE_STATES[(SERVICE_STATES.indexOf(service) + 1) % SERVICE_STATES.length])}
              last
            />
          </SettingsGroup>
        </View>
      )}

      {customer && (
        <View style={styles.section}>
          <SettingsGroup>
            <SettingsRow
              icon={LogOut}
              label={t('signOut')}
              danger
              onPress={
                signOutBlocked
                  ? undefined
                  : () => {
                      choiceHaptic();
                      setConfirmOut(true);
                    }
              }
              last
            />
          </SettingsGroup>
          {signOutBlocked && <Text style={styles.note}>{t('signOutBlocked')}</Text>}
        </View>
      )}

      <BottomSheet visible={confirmOut} title={t('signOutTitle')} closeLabel={t('close')} onClose={() => setConfirmOut(false)}>
        <Text style={styles.sheetText}>{t('signOutBody')}</Text>
        <View style={styles.sheetActions}>
          <PrimaryButton label={t('staySignedIn')} onPress={() => setConfirmOut(false)} />
          <PressableScale
            onPress={() => {
              setConfirmOut(false);
              signOut();
            }}
            accessibilityRole="button"
            style={styles.signOutConfirm}>
            <LogOut size={18} color={Brand.danger} strokeWidth={2.25} />
            <Text style={styles.signOutText}>{t('signOut')}</Text>
          </PressableScale>
        </View>
      </BottomSheet>
    </TabScreen>
  );
}

const AVATAR = 60;

const useStyles = makeStyles((Brand) => ({
  flex: {
    flex: 1,
  },
  pressed: {
    backgroundColor: Brand.border,
  },
  card: {
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: Brand.surface,
    overflow: 'hidden',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },
  avatarEmpty: {
    backgroundColor: Brand.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 19,
    fontWeight: '700',
    color: Brand.text,
  },
  phone: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '600',
    color: Brand.link,
    fontVariant: ['tabular-nums'],
  },
  ratingRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
  },
  ratingValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  ratingLabel: {
    fontSize: 17,
    fontWeight: '500',
    color: Brand.text,
  },
  promo: {
    marginTop: 16,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 20,
    backgroundColor: Brand.primary,
  },
  promoText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.onPrimary,
  },
  promoAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Brand.card,
    fontSize: 14,
    fontWeight: '800',
    color: Brand.link,
  },
  section: {
    marginTop: 16,
  },
  note: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: Brand.muted,
    textAlign: 'center',
  },
  sheetText: {
    fontSize: 16,
    lineHeight: 23,
    color: Brand.text,
  },
  sheetActions: {
    marginTop: 16,
    gap: 10,
  },
  signOutConfirm: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: Brand.dangerFill,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.danger,
  },
}));
