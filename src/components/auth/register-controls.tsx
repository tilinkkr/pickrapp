import { Image } from 'expo-image';
import { Camera, Check, type LucideIcon } from '@/components/ui/icons';
import { StyleSheet, Text, View } from 'react-native';

import { DuoIcon } from '@/components/ui/duo-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Brand } from '@/constants/theme';

import { INK, INPUT_BORDER, INPUT_FILL, LINK_ORANGE, MUTED } from './auth-chrome';

const AVATAR = 96;

type AvatarPickerProps = {
  uri?: string;
  label: string;
  onPress: () => void;
};

/** 96pt circle: a camera until a photo is picked, then the photo with a check badge. */
export function AvatarPicker({ uri, label, onPress }: AvatarPickerProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.avatarBlock}>
      <View>
        <View style={styles.avatar}>
          {uri ? (
            <Image source={{ uri }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <DuoIcon icon={Camera} size={32} color={INK} />
          )}
        </View>
        {uri && (
          <View style={styles.avatarBadge}>
            <Check size={14} color={Brand.onPrimary} strokeWidth={3} />
          </View>
        )}
      </View>
      <Text style={styles.avatarLabel}>{label}</Text>
    </PressableScale>
  );
}

type ChoiceCardProps = {
  label: string;
  icon: LucideIcon;
  selected: boolean;
  onPress: () => void;
};

/** One of a set of side-by-side radio cards. */
export function ChoiceCard({ label, icon, selected, onPress }: ChoiceCardProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[styles.choice, selected && styles.choiceSelected]}>
      <DuoIcon icon={icon} size={20} color={selected ? INK : MUTED} />
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
      {selected && <Check size={16} color={Brand.primary} strokeWidth={3} />}
    </PressableScale>
  );
}

type CheckRowProps = {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  accessibilityLabel: string;
};

/** 24pt square checkbox beside wrapping text; the whole row is the touch target. */
export function CheckRow({ checked, onToggle, children, accessibilityLabel }: CheckRowProps) {
  return (
    <PressableScale
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      style={styles.checkRow}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Check size={16} color={Brand.onPrimary} strokeWidth={3} />}
      </View>
      <Text style={styles.checkText}>{children}</Text>
    </PressableScale>
  );
}

export const checkTextStyles = StyleSheet.create({
  // Not underlined: there is no Terms page to link to yet, and an underline would promise one.
  strong: {
    fontWeight: '700',
    color: INK,
  },
});

const styles = StyleSheet.create({
  avatarBlock: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 2,
    borderColor: INPUT_BORDER,
    backgroundColor: INPUT_FILL,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Brand.card,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: LINK_ORANGE,
  },
  choice: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    backgroundColor: INPUT_FILL,
  },
  choiceSelected: {
    borderWidth: 2,
    borderColor: Brand.primary,
    backgroundColor: Brand.selected,
  },
  choiceText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    color: MUTED,
  },
  choiceTextSelected: {
    fontWeight: '700',
    color: INK,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: INPUT_BORDER,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: Brand.primary,
    backgroundColor: Brand.primary,
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
  },
});
