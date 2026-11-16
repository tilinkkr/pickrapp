import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';
import { choiceHaptic } from '@/lib/haptics';
import { useSession } from '@/lib/session';

/** Darker than the brand orange so links stay readable on white in sunlight. */
export const LINK_ORANGE = Brand.link;
export const INK = Brand.text;
export const MUTED = Brand.muted;
export const INPUT_FILL = Brand.surface;
export const INPUT_BORDER = Brand.border;

type AuthLayoutProps = PropsWithChildren<{
  /** The sticky bottom dock: the primary action within thumb reach. */
  dock: React.ReactNode;
}>;

/** White canvas, one centred column on a 24px grid, and a sticky bottom dock. */
export function AuthLayout({ dock, children }: AuthLayoutProps) {
  const { width } = useWindowDimensions();
  const maxWidth = width >= 768 ? 600 : 480;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={[styles.column, { maxWidth }]}>{children}</View>
        </ScrollView>
        <View style={styles.dock}>
          <View style={[styles.column, { maxWidth }]}>{dock}</View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Single text toggle that switches to the other language (English ↔ Malayalam). */
export function LanguageToggle() {
  const { language, setLanguage } = useSession();
  const next = language === 'en' ? 'ml' : 'en';
  const label = next === 'ml' ? 'മലയാളം' : 'English';

  return (
    <Pressable
      onPress={() => {
        choiceHaptic();
        setLanguage(next);
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={styles.toggle}>
      <Text style={styles.toggleText}>{label}</Text>
    </Pressable>
  );
}

export function InlineLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Text onPress={onPress} accessibilityRole="link" suppressHighlighting style={styles.inlineLink}>
      {label}
    </Text>
  );
}

export const authStyles = StyleSheet.create({
  topBar: {
    marginTop: 32,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    marginTop: 24,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: INK,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    color: MUTED,
  },
  fieldError: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: Brand.danger,
  },
  devNote: {
    marginTop: 24,
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Brand.card,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  column: {
    width: '100%',
  },
  dock: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: Brand.card,
  },
  toggle: {
    minHeight: 44,
    justifyContent: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: MUTED,
  },
  inlineLink: {
    fontSize: 15,
    fontWeight: '600',
    color: LINK_ORANGE,
  },
});
