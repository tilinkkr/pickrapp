import { useState } from 'react';
import { Text, TextInput } from 'react-native';

import { ProfilePage, SettingsGroup, SettingsRow } from '@/components/profile/settings';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Building2, Mail, MessageCircle, Smartphone, User } from '@/components/ui/icons';
import { PrimaryButton } from '@/components/ui/primary-button';
import { makeStyles } from '@/lib/app-theme';
import { successHaptic } from '@/lib/haptics';
import { formatIndianMobile } from '@/lib/otp';
import { useSession } from '@/lib/session';

const MOBILE = /^[6-9]\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Account details: name and mobile are operator-managed in the pilot; WhatsApp and email are the customer's to change. */
export default function AccountScreen() {
  const styles = useStyles();
  const { t, session, updateProfile } = useSession();
  const [editing, setEditing] = useState<'whatsapp' | 'email' | null>(null);
  const [value, setValue] = useState('');
  const customer = session?.kind === 'customer' ? session : null;
  if (!customer) return <ProfilePage title={t('accountDetails')}>{null}</ProfilePage>;

  const valid = editing === 'whatsapp' ? MOBILE.test(value) : value.trim() === '' || EMAIL.test(value.trim());

  function save() {
    if (!valid || !customer) return;
    successHaptic();
    if (editing === 'whatsapp') {
      updateProfile({ whatsapp: value, consent: { ...(customer.consent ?? { bookings: true, location: true }), whatsapp: true, at: new Date().toISOString() } });
    } else updateProfile({ email: value.trim() });
    setEditing(null);
  }

  return (
    <ProfilePage title={t('accountDetails')}>
      <SettingsGroup>
        <SettingsRow icon={User} label={t('fullName')} value={customer.name} />
        <SettingsRow icon={Smartphone} label={t('mobileNumber')} value={formatIndianMobile(customer.phone)} />
        <SettingsRow
          icon={MessageCircle}
          label={t('whatsappNumber')}
          value={customer.whatsapp ? formatIndianMobile(customer.whatsapp) : t('notAdded')}
          onPress={() => {
            setValue(customer.whatsapp ?? customer.phone);
            setEditing('whatsapp');
          }}
        />
        <SettingsRow
          icon={Mail}
          label={t('emailOptional')}
          value={customer.email || t('notAdded')}
          onPress={() => {
            setValue(customer.email ?? '');
            setEditing('email');
          }}
        />
        <SettingsRow
          icon={customer.customerType === 'business' ? Building2 : User}
          label={t('customerType')}
          value={t(customer.customerType === 'business' ? 'business' : 'individual')}
          last
        />
      </SettingsGroup>
      <Text style={styles.note}>{t('profileManaged')}</Text>

      <BottomSheet
        visible={editing !== null}
        title={editing === 'whatsapp' ? t('whatsappNumber') : t('emailOptional')}
        closeLabel={t('close')}
        onClose={() => setEditing(null)}>
        <TextInput
          value={value}
          onChangeText={(v) => setValue(editing === 'whatsapp' ? v.replace(/\D/g, '').slice(0, 10) : v)}
          keyboardType={editing === 'whatsapp' ? 'phone-pad' : 'email-address'}
          autoCapitalize="none"
          autoFocus
          placeholder={editing === 'whatsapp' ? '98765 43210' : 'name@example.com'}
          placeholderTextColor="#A8A29E"
          style={styles.input}
        />
        {editing === 'whatsapp' && <Text style={styles.note}>{t('consentWhatsapp')}</Text>}
        <PrimaryButton label={t('save')} onPress={save} disabled={!valid} />
      </BottomSheet>
    </ProfilePage>
  );
}

const useStyles = makeStyles((Brand) => ({
  note: {
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 18,
    color: Brand.muted,
  },
  input: {
    height: 56,
    marginBottom: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: Brand.surface,
    fontSize: 18,
    fontWeight: '600',
    color: Brand.text,
    outlineWidth: 0,
  },
}));
