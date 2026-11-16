import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Brand } from '@/constants/theme';

import { INK, INPUT_BORDER, INPUT_FILL, MUTED } from './auth-chrome';

type PhoneFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  invalid: boolean;
  accessibilityLabel: string;
};

/** 56pt "+91 | number" field; a 2pt orange stroke fades in while focused (red when invalid). */
export function PhoneField({ value, onChangeText, onSubmit, invalid, accessibilityLabel }: PhoneFieldProps) {
  const [focused, setFocused] = useState(false);
  const ring = useSharedValue(0);

  useEffect(() => {
    ring.set(withTiming(focused || invalid ? 1 : 0, { duration: 150 }));
  }, [focused, invalid, ring]);

  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));

  return (
    <View style={styles.field}>
      <Text style={styles.prefix} accessibilityLabel="India, plus 91">
        +91
      </Text>
      <View style={styles.divider} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmit}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        importantForAutofill="yes"
        // Room for a pasted "+91 98765 43210"; the screen keeps only the 10 digits.
        maxLength={15}
        returnKeyType="done"
        placeholder="98765 43210"
        placeholderTextColor="#B5ADA6"
        accessibilityLabel={accessibilityLabel}
        style={styles.input}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, invalid && styles.ringInvalid, ringStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    backgroundColor: INPUT_FILL,
    paddingLeft: 16,
  },
  prefix: {
    fontSize: 17,
    fontWeight: '500',
    color: MUTED,
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
    backgroundColor: INPUT_BORDER,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingRight: 16,
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: INK,
    // The field draws its own focus ring; drop the browser's on web.
    outlineWidth: 0,
  },
  ring: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Brand.primary,
  },
  ringInvalid: {
    borderColor: Brand.danger,
  },
});
