import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { PrimaryButton } from '@/components/ui/primary-button';
import { makeStyles } from '@/lib/app-theme';
import type { StringKey } from '@/lib/i18n';
import { choiceHaptic } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import { formatRupees } from '@/lib/trip-format';

const REASONS: StringKey[] = ['reasonPlans', 'reasonMistake', 'reasonWaiting', 'reasonOther'];

type CancelSheetProps = {
  visible: boolean;
  /** The charge cancelling would record now (0 while searching). */
  fee: number;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

/**
 * Cancel (handoff C20): pick or type a reason, see the charge (none while
 * searching; min(₹100, 10%) once a driver has accepted), then confirm. "Keep booking" is the easy way out.
 */
export function CancelSheet({ visible, fee, onClose, onConfirm }: CancelSheetProps) {
  const styles = useStyles();
  const { t } = useSession();
  const [reason, setReason] = useState<StringKey | null>(null);
  const [other, setOther] = useState('');

  const text = reason === 'reasonOther' ? other.trim() : reason ? t(reason) : '';

  return (
    <BottomSheet visible={visible} title={t('cancelTitle')} closeLabel={t('keepBooking')} onClose={onClose}>
      <Text style={styles.body}>{fee > 0 ? t('cancelFeeBody', { amount: formatRupees(fee) }) : t('cancelFree')}</Text>
      <View style={styles.reasons}>
        {REASONS.map((key) => {
          const selected = reason === key;
          return (
            <Pressable
              key={key}
              onPress={() => {
                choiceHaptic();
                setReason(key);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.reason, selected && styles.reasonSelected]}>
              <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>{t(key)}</Text>
            </Pressable>
          );
        })}
      </View>
      {reason === 'reasonOther' && (
        <TextInput
          value={other}
          onChangeText={setOther}
          placeholder={t('reasonPlaceholder')}
          placeholderTextColor="#A39B94"
          maxLength={200}
          accessibilityLabel={t('reasonOther')}
          style={styles.input}
        />
      )}
      <View style={styles.actions}>
        <PrimaryButton label={t('keepBooking')} onPress={onClose} />
        <PrimaryButton variant="outline" label={t('confirmCancel')} disabled={!text} onPress={() => onConfirm(text)} />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles((Brand) => ({
  body: {
    fontSize: 16,
    lineHeight: 23,
    color: Brand.text,
  },
  reasons: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reason: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Brand.border,
    justifyContent: 'center',
  },
  reasonSelected: {
    borderColor: Brand.onPrimary,
    backgroundColor: Brand.onPrimary,
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Brand.text,
  },
  reasonTextSelected: {
    color: '#FFFFFF',
  },
  input: {
    marginTop: 12,
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Brand.border,
    fontSize: 16,
    color: Brand.text,
    outlineWidth: 0,
  },
  actions: {
    marginTop: 18,
    gap: 10,
  },
}));
