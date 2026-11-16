import { Switch } from 'react-native';

import { ProfilePage, SettingsGroup, SettingsRow } from '@/components/profile/settings';
import { EmptyState } from '@/components/trips/empty-state';
import { Bell, Coins, MessageCircle, Truck } from '@/components/ui/icons';
import { useBrand } from '@/lib/app-theme';
import { selectionHaptic } from '@/lib/haptics';
import { useSession } from '@/lib/session';

type Key = 'trip' | 'whatsapp' | 'offers';
const DEFAULTS = { trip: true, whatsapp: true, offers: false };

/** Notifications: three switches (saved on the profile) and the inbox, empty until push is set up. */
export default function NotificationsScreen() {
  const Brand = useBrand();
  const { t, session, updateProfile } = useSession();
  const customer = session?.kind === 'customer' ? session : null;
  const notify = customer?.notify ?? DEFAULTS;

  const toggle = (key: Key) => (
    <Switch
      value={notify[key]}
      onValueChange={(on) => {
        selectionHaptic();
        updateProfile({ notify: { ...notify, [key]: on } });
      }}
      trackColor={{ true: Brand.primary, false: Brand.border }}
    />
  );

  return (
    <ProfilePage title={t('notifications')}>
      <SettingsGroup>
        <SettingsRow icon={Truck} label={t('notifTrip')} trailing={toggle('trip')} />
        <SettingsRow icon={MessageCircle} label={t('notifWhatsapp')} trailing={toggle('whatsapp')} />
        <SettingsRow icon={Coins} label={t('notifOffers')} trailing={toggle('offers')} last />
      </SettingsGroup>
      <SettingsGroup title={t('inbox')}>
        <EmptyState icon={Bell} title={t('inboxEmpty')} />
      </SettingsGroup>
    </ProfilePage>
  );
}
