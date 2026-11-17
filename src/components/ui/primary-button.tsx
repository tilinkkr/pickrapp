import { CheckCircle2, type LucideIcon } from '@/components/ui/icons';
import { ActivityIndicator, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { makeStyles, useBrand } from '@/lib/app-theme';
import { popIn } from '@/lib/motion';

import { DuoIcon } from './duo-icon';
import { PressableScale } from './pressable-scale';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Shows a check mark that pops in over the icon; the button stops responding. */
  success?: boolean;
  icon?: LucideIcon;
  variant?: 'solid' | 'outline';
  accessibilityHint?: string;
};

/** 56pt action button: solid Signal Orange, or outlined for secondary actions. */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  success = false,
  icon,
  variant = 'solid',
  accessibilityHint,
}: PrimaryButtonProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const inactive = disabled || loading || success;
  const iconFill = variant === 'solid' ? Brand.card : Brand.primary;

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        styles.button,
        variant === 'solid' ? styles.solid : styles.outline,
        disabled && !loading && !success && styles.disabled,
      ]}>
      <View style={styles.content}>
        {success ? (
          <Animated.View key="success" entering={popIn()}>
            <DuoIcon icon={CheckCircle2} fill={iconFill} />
          </Animated.View>
        ) : loading ? (
          <ActivityIndicator color={Brand.onPrimary} />
        ) : (
          icon && <DuoIcon icon={icon} fill={iconFill} />
        )}
        <Text style={[styles.label, variant === 'outline' && styles.labelOutline]} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles((Brand) => ({
  button: {
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  solid: {
    backgroundColor: Brand.primary,
  },
  outline: {
    backgroundColor: Brand.card,
    borderWidth: 1.5,
    borderColor: Brand.onPrimary,
  },
  disabled: {
    opacity: 0.4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    color: Brand.onPrimary,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  labelOutline: {
    color: Brand.text,
  },
}));
