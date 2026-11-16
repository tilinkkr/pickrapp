import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChevronLeft, ChevronRight, type LucideIcon } from '@/components/ui/icons';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { selectionHaptic } from '@/lib/haptics';
import { useSession } from '@/lib/session';

type ProfilePageProps = {
  title: string;
  children: ReactNode;
  /** Icon button at the top right (e.g. Help on Payment). */
  action?: { icon: LucideIcon; label: string; onPress: () => void };
  /** Sticky bottom dock for the page's one action. */
  footer?: ReactNode;
  /** Scroll offset on the UI thread, for scroll-linked headers. */
  scrollY?: SharedValue<number>;
  /** Drawn over the content, under the header (e.g. a centred rating that appears on scroll). */
  overlay?: ReactNode;
};

/** A profile sub-page: back arrow, left-aligned title, one scrolling column on a 24 px grid. */
export function ProfilePage({ title, children, action, footer, scrollY, overlay }: ProfilePageProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY?.set(event.contentOffset.y);
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={8} style={styles.headerButton}>
          <ChevronLeft size={28} color={Brand.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {action ? (
          <Pressable onPress={action.onPress} accessibilityRole="button" accessibilityLabel={action.label} hitSlop={8} style={styles.headerButton}>
            <action.icon size={22} color={Brand.link} strokeWidth={2.25} />
          </Pressable>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.flex}>
          <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {children}
          </Animated.ScrollView>
          {overlay}
        </View>
        {footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** A titled group of rows on one rounded surface, hairlines between rows. */
export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View>
      {title && <Text style={styles.groupTitle}>{title}</Text>}
      <View style={styles.group}>{children}</View>
    </View>
  );
}

type SettingsRowProps = {
  icon: LucideIcon;
  label: string;
  value?: string;
  /** Right-hand control instead of a chevron (switch, segmented). */
  trailing?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  danger?: boolean;
};

/** One row: icon, label, optional value, chevron when it opens something (Rapido/Uber settings pattern). */
export function SettingsRow({ icon: Icon, label, value, trailing, onPress, last, danger }: SettingsRowProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const color = danger ? Brand.danger : Brand.text;
  const body = (
    <>
      <View style={styles.iconSlot}>
        <Icon size={22} color={danger ? Brand.danger : Brand.muted} strokeWidth={1.75} />
      </View>
      <View style={[styles.rowMain, !last && styles.rowDivider]}>
        <Text style={[styles.rowLabel, { color }]} numberOfLines={1}>
          {label}
        </Text>
        {value !== undefined && (
          <Text style={styles.rowValue} numberOfLines={1}>
            {value}
          </Text>
        )}
        {trailing}
        {onPress && !trailing && <ChevronRight size={20} color={Brand.muted} strokeWidth={2.25} />}
      </View>
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

const useStyles = makeStyles((Brand) => ({
  safe: {
    flex: 1,
    backgroundColor: Brand.card,
  },
  flex: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  headerButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Brand.text,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
    backgroundColor: Brand.card,
  },
  groupTitle: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Brand.muted,
  },
  group: {
    borderRadius: 20,
    backgroundColor: Brand.surface,
    overflow: 'hidden',
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    backgroundColor: Brand.border,
  },
  iconSlot: {
    width: 56,
    alignItems: 'center',
  },
  rowMain: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  rowLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
  },
  rowValue: {
    maxWidth: '45%',
    fontSize: 14,
    color: Brand.muted,
  },
}));
