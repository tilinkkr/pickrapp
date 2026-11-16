import { Switch, Text, View } from 'react-native';

import { ProfilePage, SettingsGroup, SettingsRow } from '@/components/profile/settings';
import { BadgeCheck, MapPin, MessageCircle, Trash2 } from '@/components/ui/icons';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { selectionHaptic } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import { formatWhen } from '@/lib/trip-format';

/**
 * Privacy & data (DPDP Act 2023): the booking purpose is required to use the
 * service; location and WhatsApp consent can be withdrawn here at any time,
 * and every change is time-stamped.
 */
export default function PrivacyScreen() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t, language, session, updateProfile } = useSession();
  const customer = session?.kind === 'customer' ? session : null;
  const consent = customer?.consent ?? { bookings: true as const, location: true, whatsapp: false, at: new Date().toISOString() };

  function set(key: 'location' | 'whatsapp', on: boolean) {
    selectionHaptic();
    updateProfile({ consent: { ...consent, [key]: on, at: new Date().toISOString() } });
  }

  const toggle = (on: boolean, key: 'location' | 'whatsapp') => (
    <Switch value={on} onValueChange={(v) => set(key, v)} trackColor={{ true: Brand.primary, false: Brand.border }} />
  );

  return (
    <ProfilePage title={t('privacyData')}>
      <View>
        <Text style={styles.title}>{t('consentTitle')}</Text>
        <Text style={styles.body}>{t('consentNote')}</Text>
      </View>
      <SettingsGroup>
        <SettingsRow icon={BadgeCheck} label={t('consentRequired')} value={t('consentBookings')} />
        <SettingsRow icon={MapPin} label={t('consentLocation')} trailing={toggle(consent.location, 'location')} />
        <SettingsRow icon={MessageCircle} label={t('consentWhatsapp')} trailing={toggle(consent.whatsapp, 'whatsapp')} last />
      </SettingsGroup>
      <Text style={styles.small}>{t('consentGiven', { date: formatWhen(language, new Date(consent.at)) })}</Text>
      <SettingsGroup>
        <SettingsRow icon={Trash2} label={t('eraseRequest')} danger last />
      </SettingsGroup>
      <Text style={styles.small}>{t('eraseRequestBody')}</Text>
    </ProfilePage>
  );
}

const useStyles = makeStyles((Brand) => ({
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Brand.text,
  },
  body: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: Brand.muted,
  },
  small: {
    marginTop: -12,
    fontSize: 12,
    lineHeight: 17,
    color: Brand.muted,
  },
}));
