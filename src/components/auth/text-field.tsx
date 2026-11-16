import type { LucideIcon } from '@/components/ui/icons';
import { useEffect, useId, useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { DuoIcon } from '@/components/ui/duo-icon';
import { Brand } from '@/constants/theme';

import { authStyles, INK, INPUT_BORDER, INPUT_FILL } from './auth-chrome';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  icon: LucideIcon;
  /** Shown under the field, and turns the stroke red. */
  error?: string | null;
};

/** Uppercase label over a 56pt input with a leading two-tone icon and a 2pt orange focus stroke. */
export function TextField({ label, icon, error, onFocus, onBlur, ...inputProps }: TextFieldProps) {
  const labelId = useId();
  const [focused, setFocused] = useState(false);
  const ring = useSharedValue(0);

  useEffect(() => {
    ring.set(withTiming(focused || error ? 1 : 0, { duration: 150 }));
  }, [focused, error, ring]);

  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));

  return (
    <View>
      <Text style={fieldStyles.label} nativeID={labelId}>
        {label}
      </Text>
      <View style={styles.field}>
        <DuoIcon icon={icon} size={20} color={INK} />
        <TextInput
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor="#B5ADA6"
          accessibilityLabel={label}
          accessibilityLabelledBy={labelId}
          style={styles.input}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, error && styles.ringError, ringStyle]}
        />
      </View>
      {error && (
        <Text style={authStyles.fieldError} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

export const fieldStyles = StyleSheet.create({
  label: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: INK,
  },
});

const styles = StyleSheet.create({
  field: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    backgroundColor: INPUT_FILL,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingRight: 16,
    fontSize: 17,
    fontWeight: '500',
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
  ringError: {
    borderColor: Brand.danger,
  },
});
