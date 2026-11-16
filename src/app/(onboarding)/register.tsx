import * as ImagePicker from 'expo-image-picker';
import { Redirect } from 'expo-router';
import { Building2, Mail, MessageCircle, User } from '@/components/ui/icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AuthLayout, authStyles, LanguageToggle } from '@/components/auth/auth-chrome';
import {
  AvatarPicker,
  CheckRow,
  checkTextStyles,
  ChoiceCard,
} from '@/components/auth/register-controls';
import { fieldStyles, TextField } from '@/components/auth/text-field';
import { PickrTruck } from '@/components/brand/pickr-truck';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Brand } from '@/constants/theme';
import { choiceHaptic, errorHaptic, successHaptic, tapHaptic } from '@/lib/haptics';
import { type CustomerType, useSession } from '@/lib/session';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * New-customer profile, shown once after OTP when the number has no account
 * (collects the name handoff C01 requires). Register → Home.
 */
export default function RegisterScreen() {
  const { t, pending, signIn } = useSession();
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [whatsappSame, setWhatsappSame] = useState(true);
  const [whatsapp, setWhatsapp] = useState('');
  const [consentLocation, setConsentLocation] = useState(true);
  const [consentWhatsapp, setConsentWhatsapp] = useState(true);
  const [touched, setTouched] = useState({ name: false, email: false, whatsapp: false });

  const nameOk = fullName.trim().length >= 2;
  // Email is optional; when given it must look like one.
  const emailOk = email.trim() === '' || EMAIL.test(email.trim());
  const whatsappOk = whatsappSame || /^[6-9]\d{9}$/.test(whatsapp.replace(/\D/g, ''));
  // Booking consent (DPDP Act 2023) is part of agreeing to the terms; the rest are optional.
  const canRegister = nameOk && emailOk && whatsappOk && customerType !== null && agreedToTerms;

  // A small spring "pop" the moment the form becomes complete.
  const pop = useSharedValue(1);
  useEffect(() => {
    if (canRegister) pop.set(withSequence(withTiming(1.01, { duration: 120 }), withTiming(1, { duration: 160 })));
  }, [canRegister, pop]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  if (!pending?.verified) return <Redirect href="/auth" />;
  const { phone } = pending;

  async function pickPhoto() {
    tapHaptic();
    setPhotoError(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled) setPhotoUri(result.assets[0]?.uri);
    } catch {
      setPhotoError(true);
    }
  }

  function register() {
    if (!canRegister || customerType === null) {
      errorHaptic();
      setTouched({ name: true, email: true, whatsapp: true });
      return;
    }
    successHaptic();
    // No account backend yet: the profile lives in the saved session.
    signIn({
      kind: 'customer',
      phone,
      name: fullName.trim(),
      email: email.trim(),
      customerType,
      whatsapp: whatsappSame ? phone : whatsapp.replace(/\D/g, ''),
      consent: { bookings: true, location: consentLocation, whatsapp: consentWhatsapp, at: new Date().toISOString() },
      photoUri,
    });
  }

  return (
    <AuthLayout
      dock={
        <Animated.View style={popStyle}>
          <PrimaryButton label={t('register')} onPress={register} disabled={!canRegister} />
        </Animated.View>
      }>
      <View style={authStyles.topBar}>
        <View style={styles.logo} accessible accessibilityLabel="Pickr">
          <PickrTruck width={26} withSpeedLines />
        </View>
        <LanguageToggle />
      </View>

      <Text style={authStyles.title} accessibilityRole="header">
        {t('registerTitle')}
      </Text>
      <Text style={authStyles.subtitle}>{t('registerSub')}</Text>

      <View style={styles.avatar}>
        <AvatarPicker
          uri={photoUri}
          label={photoUri ? t('changePhoto') : t('addPhoto')}
          onPress={pickPhoto}
        />
        {photoError && (
          <Text style={[authStyles.fieldError, styles.center]} accessibilityRole="alert">
            {t('photoFailed')}
          </Text>
        )}
      </View>

      <View style={styles.fields}>
        <TextField
          label={t('fullName')}
          icon={User}
          value={fullName}
          onChangeText={setFullName}
          onBlur={() => setTouched((s) => ({ ...s, name: true }))}
          placeholder={t('fullNamePlaceholder')}
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
          maxLength={60}
          returnKeyType="next"
          error={touched.name && !nameOk ? t('nameMissing') : null}
        />

        <View style={styles.gap16}>
          <TextField
            label={t('emailOptional')}
            icon={Mail}
            value={email}
            onChangeText={setEmail}
            onBlur={() => setTouched((s) => ({ ...s, email: true }))}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            autoComplete="email"
            maxLength={120}
            returnKeyType="done"
            error={touched.email && !emailOk ? t('emailInvalid') : null}
          />
        </View>

        <View style={styles.gap16}>
          <CheckRow
            checked={whatsappSame}
            onToggle={() => {
              tapHaptic();
              setWhatsappSame((v) => !v);
            }}
            accessibilityLabel={`${t('whatsappNumber')}: ${t('sameAsMobile')}`}>
            <Text style={checkTextStyles.strong}>{t('whatsappNumber')}</Text>
            {` · ${t('sameAsMobile')}`}
          </CheckRow>
          {!whatsappSame && (
            <View style={styles.gap8}>
              <TextField
                label={t('whatsappNumber')}
                icon={MessageCircle}
                value={whatsapp}
                onChangeText={(v) => setWhatsapp(v.replace(/\D/g, '').slice(0, 10))}
                onBlur={() => setTouched((s) => ({ ...s, whatsapp: true }))}
                placeholder="98765 43210"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                maxLength={10}
                error={touched.whatsapp && !whatsappOk ? t('phoneInvalid') : null}
              />
            </View>
          )}
        </View>

        <View style={styles.gap16}>
          <Text style={fieldStyles.label} nativeID="customerTypeLabel">
            {t('customerType')}
          </Text>
          <View
            style={styles.choices}
            accessibilityRole="radiogroup"
            accessibilityLabelledBy="customerTypeLabel">
            <ChoiceCard
              label={t('individual')}
              icon={User}
              selected={customerType === 'individual'}
              onPress={() => {
                choiceHaptic();
                setCustomerType('individual');
              }}
            />
            <ChoiceCard
              label={t('business')}
              icon={Building2}
              selected={customerType === 'business'}
              onPress={() => {
                choiceHaptic();
                setCustomerType('business');
              }}
            />
          </View>
        </View>

        <View style={styles.gap20}>
          <CheckRow
            checked={agreedToTerms}
            onToggle={() => {
              tapHaptic();
              setAgreedToTerms((v) => !v);
            }}
            accessibilityLabel={`${t('agreeBefore')}${t('agreeTerms')}${t('agreeAfter')}`}>
            {t('agreeBefore')}
            <Text style={checkTextStyles.strong}>{t('agreeTerms')}</Text>
            {t('agreeAfter')}
            {` ${t('consentBookings')}.`}
          </CheckRow>
        </View>

        <View style={styles.consent}>
          <Text style={styles.consentTitle}>{t('consentTitle')}</Text>
          <CheckRow
            checked={consentLocation}
            onToggle={() => {
              tapHaptic();
              setConsentLocation((v) => !v);
            }}
            accessibilityLabel={t('consentLocation')}>
            {t('consentLocation')}
          </CheckRow>
          <CheckRow
            checked={consentWhatsapp}
            onToggle={() => {
              tapHaptic();
              setConsentWhatsapp((v) => !v);
            }}
            accessibilityLabel={t('consentWhatsapp')}>
            {t('consentWhatsapp')}
          </CheckRow>
          <Text style={styles.consentNote}>{t('consentNote')}</Text>
        </View>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  gap8: {
    marginTop: 8,
  },
  consent: {
    marginTop: 20,
    padding: 14,
    gap: 10,
    borderRadius: 16,
    backgroundColor: Brand.selected,
  },
  consentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.text,
  },
  consentNote: {
    fontSize: 12,
    lineHeight: 17,
    color: Brand.muted,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Brand.night,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    marginTop: 24,
  },
  fields: {
    marginTop: 24,
  },
  gap16: {
    marginTop: 16,
  },
  gap20: {
    marginTop: 20,
  },
  choices: {
    flexDirection: 'row',
    gap: 12,
  },
  center: {
    textAlign: 'center',
  },
});
