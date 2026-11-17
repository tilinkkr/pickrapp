import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { X } from '@/components/ui/icons';
import { useSheetDepth } from '@/components/ui/sheet-depth';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { CURVE, DURATION } from '@/lib/motion';

type BottomSheetProps = PropsWithChildren<{
  visible: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
}>;

/**
 * Solid sheet that slides up over a dimmed screen (no blur, so text stays
 * sharp outdoors). It arrives on the Base decelerate curve with no spring, and
 * it rides up with the keyboard so a field inside it is never covered.
 */
export function BottomSheet({ visible, title, closeLabel, onClose, children }: BottomSheetProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  useSheetDepth(visible);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={closeLabel} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.dock} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.duration(DURATION.sheet - 60).easing(CURVE.decelerate)}
          style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}
          accessibilityViewIsModal>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              hitSlop={8}
              style={styles.close}>
              <X size={22} color={Brand.text} strokeWidth={2} />
            </Pressable>
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((Brand) => ({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(24, 17, 20, 0.45)',
  },
  dock: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    paddingHorizontal: 24,
    paddingTop: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Brand.card,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Brand.border,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: Brand.text,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
