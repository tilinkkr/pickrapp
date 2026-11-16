import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthLayout, authStyles, LanguageToggle, MUTED } from '@/components/auth/auth-chrome';
import { PhoneField } from '@/components/auth/phone-field';
import { PickrTruck } from '@/components/brand/pickr-truck';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Brand } from '@/constants/theme';
import { choiceHaptic, errorHaptic, selectionHaptic, tapHaptic } from '@/lib/haptics';
import type { StringKey } from '@/lib/i18n';
import { isValidIndianMobile, requestOtp } from '@/lib/otp';
import { useSession } from '@/lib/session';

/** Strips formatting and a pasted +91 so only the 10-digit number remains. */
function toMobileDigits(text: string) {
  const digits = text.replace(/\D/g, '');
  return (digits.length > 10 && digits.startsWith('91') ? digits.slice(2) : digits).slice(0, 10);
}

/**
 * Login (handoff C01, OTP and guest entry agreed 2026-11-03): mobile number →
 * Send OTP → /otp. Guests go straight to Home.
 */
export default function AuthScreen() {
  const { t, setPending, signIn } = useSession();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);

  const valid = isValidIndianMobile(phone);
  const looksWrong = phone.length === 10 && !valid;

  async function sendOtp() {
    if (!valid || busy) return;
    tapHaptic();
    setBusy(true);
    setError(null);
    try {
      await requestOtp(phone);
      setPending({ phone });
      router.push('/otp');
    } catch {
      errorHaptic();
      setError('sendFailed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      dock={
        <>
          <PrimaryButton
            label={busy ? t('sending') : t('sendOtp')}
            onPress={sendOtp}
            disabled={!valid}
            loading={busy}
          />
          <Pressable
            onPress={() => {
              choiceHaptic();
              signIn({ kind: 'guest' });
            }}
            accessibilityRole="button"
            style={styles.guest}>
            <Text style={styles.guestText}>{t('guest')}</Text>
          </Pressable>
        </>
      }>
      <View style={authStyles.topBar}>
        <View style={styles.logo} accessible accessibilityLabel="Pickr">
          <PickrTruck width={26} withSpeedLines />
        </View>
        <LanguageToggle />
      </View>

      <Text style={authStyles.title} accessibilityRole="header">
        {t('welcome')}
      </Text>
      <Text style={authStyles.subtitle}>{t('welcomeSub')}</Text>

      <View style={styles.fieldGap}>
        <PhoneField
          value={phone}
          onChangeText={(text) => {
            const digits = toMobileDigits(text);
            if (digits.length > phone.length) selectionHaptic();
            setPhone(digits);
            setError(null);
          }}
          onSubmit={sendOtp}
          invalid={looksWrong}
          accessibilityLabel={t('mobileNumber')}
        />
        {looksWrong && (
          <Text style={authStyles.fieldError} accessibilityRole="alert">
            {t('phoneInvalid')}
          </Text>
        )}
        {error && (
          <Text style={authStyles.fieldError} accessibilityRole="alert">
            {t(error)}
          </Text>
        )}
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Brand.night,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGap: {
    marginTop: 32,
  },
  guest: {
    marginTop: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestText: {
    fontSize: 14,
    fontWeight: '600',
    color: MUTED,
  },
});
