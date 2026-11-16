import { Redirect, router } from 'expo-router';
import { ArrowLeft } from '@/components/ui/icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, type TextInputInstance, View } from 'react-native';

import {
  AuthLayout,
  authStyles,
  INK,
  InlineLink,
  LINK_ORANGE,
  MUTED,
} from '@/components/auth/auth-chrome';
import { OtpInput } from '@/components/auth/otp-input';
import { PrimaryButton } from '@/components/ui/primary-button';
import { errorHaptic, selectionHaptic, successHaptic, tapHaptic } from '@/lib/haptics';
import type { StringKey } from '@/lib/i18n';
import {
  formatIndianMobile,
  OTP_IS_STUBBED,
  OTP_LENGTH,
  requestOtp,
  RESEND_AFTER_SECONDS,
  verifyOtp,
} from '@/lib/otp';
import { useSession } from '@/lib/session';

/** How long the check mark shows before the next screen slides in. */
const VERIFIED_PAUSE_MS = 400;

/**
 * Verifies the code sent from /auth. SMS autofill or the sixth typed digit
 * submits on its own. Known customers go to Home; new ones to /register.
 */
export default function OtpScreen() {
  const { t, pending, setPending, signIn } = useSession();
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(RESEND_AFTER_SECONDS);
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);
  const otpRef = useRef<TextInputInstance>(null);
  const canResend = timer === 0;

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  if (!pending) return <Redirect href="/auth" />;
  const { phone } = pending;

  async function verify(code: string) {
    if (code.length !== OTP_LENGTH || busy || verified) return;
    setBusy(true);
    setError(null);
    try {
      const result = await verifyOtp(phone, code);
      if (!result.ok) {
        errorHaptic();
        setError('otpWrong');
        return;
      }
      successHaptic();
      setVerified(true);
      setTimeout(() => {
        if (result.name) {
          signIn({ kind: 'customer', phone, name: result.name });
        } else {
          setPending({ phone, verified: true });
          router.replace('/register');
        }
      }, VERIFIED_PAUSE_MS);
    } catch {
      errorHaptic();
      setError('verifyFailed');
    } finally {
      setBusy(false);
    }
  }

  function changeOtp(digits: string) {
    if (digits.length > otp.length) selectionHaptic();
    setOtp(digits);
    setError(null);
    if (digits.length === OTP_LENGTH) verify(digits);
  }

  async function resend() {
    if (!canResend || busy) return;
    tapHaptic();
    setBusy(true);
    setError(null);
    try {
      await requestOtp(phone);
      setOtp('');
      setTimer(RESEND_AFTER_SECONDS);
      otpRef.current?.focus();
    } catch {
      errorHaptic();
      setError('sendFailed');
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/auth');
  }

  return (
    <AuthLayout
      dock={
        <PrimaryButton
          label={verified ? t('verified') : busy ? t('verifying') : t('verifyContinue')}
          onPress={() => verify(otp)}
          disabled={otp.length !== OTP_LENGTH}
          loading={busy}
          success={verified}
        />
      }>
      <View style={authStyles.topBar}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          hitSlop={8}
          style={styles.back}>
          <ArrowLeft size={24} color={INK} strokeWidth={2} />
        </Pressable>
      </View>

      <Text style={authStyles.title} accessibilityRole="header">
        {t('otpHeadline')}
      </Text>
      <Text style={authStyles.subtitle}>
        {t('otpSentBy', { phone: formatIndianMobile(phone) })}{'  '}
        <InlineLink label={t('edit')} onPress={goBack} />
      </Text>

      <View style={styles.boxes}>
        <OtpInput
          ref={otpRef}
          value={otp}
          onChange={changeOtp}
          hasError={error === 'otpWrong'}
          disabled={busy || verified}
          autoFocus
          accessibilityLabel={t('otpLabel')}
        />
        {error && (
          <Text style={authStyles.fieldError} accessibilityRole="alert">
            {t(error)}
          </Text>
        )}
      </View>

      <View style={styles.resend} accessibilityLiveRegion="polite">
        {canResend ? (
          <Pressable onPress={resend} disabled={busy} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.resendLink}>{t('resendOtp')}</Text>
          </Pressable>
        ) : (
          <Text style={styles.resendWait}>{t('resendWait', { seconds: timer })}</Text>
        )}
      </View>

      {OTP_IS_STUBBED && __DEV__ && <Text style={authStyles.devNote}>{t('otpTestMode')}</Text>}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  back: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  boxes: {
    marginTop: 32,
  },
  resend: {
    marginTop: 24,
    minHeight: 24,
  },
  resendWait: {
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  resendLink: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: LINK_ORANGE,
  },
});
