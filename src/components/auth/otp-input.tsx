import { type Ref, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, type TextInputInstance, View } from 'react-native';

import { Brand } from '@/constants/theme';
import { OTP_LENGTH } from '@/lib/otp';

import { INK, INPUT_BORDER, INPUT_FILL } from './auth-chrome';

type OtpInputProps = {
  value: string;
  onChange: (digits: string) => void;
  hasError: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  accessibilityLabel: string;
  ref?: Ref<TextInputInstance>;
};

/**
 * Six 52×56 boxes backed by one hidden input, so SMS autofill and paste fill
 * every box at once. The box for the next digit gets a 2pt orange stroke.
 */
export function OtpInput({
  value,
  onChange,
  hasError,
  disabled,
  autoFocus,
  accessibilityLabel,
  ref,
}: OtpInputProps) {
  const [focused, setFocused] = useState(false);
  const activeIndex = Math.min(value.length, OTP_LENGTH - 1);

  return (
    <View>
      <View style={styles.row}>
        {Array.from({ length: OTP_LENGTH }, (_, i) => (
          <View
            key={i}
            style={[
              styles.box,
              focused && !disabled && i === activeIndex && styles.boxActive,
              hasError && styles.boxError,
            ]}>
            <Text style={styles.digit}>{value[i] ?? ''}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, OTP_LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={!disabled}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        importantForAutofill="yes"
        maxLength={OTP_LENGTH}
        caretHidden
        accessibilityLabel={accessibilityLabel}
        style={styles.hiddenInput}
      />
      {/* Tapping a box focuses the hidden input. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => {
          if (ref && typeof ref === 'object') ref.current?.focus();
        }}
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  box: {
    flex: 1,
    maxWidth: 52,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    backgroundColor: INPUT_FILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderWidth: 2,
    borderColor: Brand.primary,
  },
  boxError: {
    borderWidth: 2,
    borderColor: Brand.danger,
  },
  digit: {
    fontSize: 22,
    fontWeight: '600',
    color: INK,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
