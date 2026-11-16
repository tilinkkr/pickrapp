import { Pressable, Text, View } from 'react-native';

import { Minus, Plus } from '@/components/ui/icons';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { selectionHaptic } from '@/lib/haptics';

type QuantityStepperProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  /** Big number shown in the middle, e.g. "2" or "1,000". */
  valueLabel: string;
  /** Unit beside it, e.g. "Bulk units (100 cubic feet)". */
  unitLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
  onChange: (value: number) => void;
};

/** Big − / + buttons around a quantity; the ends disable instead of wrapping. */
export function QuantityStepper({
  value,
  min,
  max,
  step,
  valueLabel,
  unitLabel,
  decreaseLabel,
  increaseLabel,
  onChange,
}: QuantityStepperProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <View
      style={styles.row}
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value, text: `${valueLabel} ${unitLabel}` }}>
      <StepButton
        label={decreaseLabel}
        disabled={!canDecrease}
        onPress={() => {
          selectionHaptic();
          onChange(value - step);
        }}>
        <Minus size={24} color={canDecrease ? Brand.onPrimary : '#BDB5AE'} strokeWidth={2.5} />
      </StepButton>
      <View style={styles.middle}>
        <Text style={styles.value} accessibilityLiveRegion="polite">
          {valueLabel}
        </Text>
        <Text style={styles.unit}>{unitLabel}</Text>
      </View>
      <StepButton
        label={increaseLabel}
        disabled={!canIncrease}
        onPress={() => {
          selectionHaptic();
          onChange(value + step);
        }}>
        <Plus size={24} color={canIncrease ? Brand.onPrimary : '#BDB5AE'} strokeWidth={2.5} />
      </StepButton>
    </View>
  );
}

function StepButton({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}>
      {children}
    </Pressable>
  );
}

const useStyles = makeStyles((Brand) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  middle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Brand.card,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: Brand.selected,
  },
  disabled: {
    backgroundColor: '#F4F1EE',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: Brand.text,
  },
  unit: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    color: Brand.muted,
  },
}));
