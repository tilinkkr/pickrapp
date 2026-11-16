import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MIcon, type MIconName } from '@/components/ui/m-icon';
import { makeStyles, useBrand } from '@/lib/app-theme';

/**
 * The app's grid: one outlined card, rows and cells split by 1 px lines that
 * all meet the card's edge, the same 16 px inset everywhere, icons in one
 * fixed 40 px column so text starts on the same line down the card.
 *
 * Solid surfaces only (2026-11-14): white card on a white page, or the
 * `accent` tone (orange outline, pale orange fill) for the one grid on a
 * page that matters most. No blur and no orange-to-white washes. The file
 * and export names are kept from the earlier glass version.
 */
export function GlassCard({ children, accent }: { children: ReactNode; accent?: boolean }) {
  const styles = useStyles();
  return <View style={[styles.card, accent && styles.cardAccent]}>{children}</View>;
}

/** A row of equal cells. `divided` draws the line above it (every row after the first). */
export function GlassRow({ children, divided = true }: { children: ReactNode; divided?: boolean }) {
  const styles = useStyles();
  return <View style={[styles.row, divided && styles.lineTop]}>{children}</View>;
}

type GlassCellProps = {
  icon: MIconName;
  value: string;
  label: string;
  warn?: boolean;
  /** Draws the line on its left (every cell after the first in a row). */
  divided?: boolean;
  onPress?: () => void;
};

/** One fact in a cell: icon over a value and its label. */
export function GlassCell({ icon, value, label, warn, divided, onPress }: GlassCellProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const body = (
    <>
      <MIcon name={icon} size={22} color={warn ? Brand.danger : Brand.primary} />
      <Text style={[styles.value, warn && styles.valueWarn]} numberOfLines={2}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </>
  );
  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.cell, divided && styles.lineLeft, pressed && styles.pressed]}>
      {body}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={[styles.cell, divided && styles.lineLeft]}>
      {body}
    </View>
  );
}

type InfoRowProps = {
  icon: MIconName;
  label: string;
  value: string;
  divided?: boolean;
  /** Right-hand content, e.g. a number plate. */
  trailing?: ReactNode;
};

/** A full-width row: icon column, small label over the value, optional trailing content. */
export function InfoRow({ icon, label, value, divided, trailing }: InfoRowProps) {
  const Brand = useBrand();
  const styles = useStyles();
  return (
    <View style={[styles.info, divided && styles.lineTop]}>
      <View style={styles.iconCol}>
        <MIcon name={icon} size={22} color={Brand.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      {trailing}
    </View>
  );
}

type ActionCellProps = { icon: MIconName; label: string; onPress: () => void; danger?: boolean; disabled?: boolean; divided?: boolean; hint?: string };

/** A button as a grid cell, for a row of actions (Call | Cancel). */
export function ActionCell({ icon, label, onPress, danger, disabled, divided, hint }: ActionCellProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const color = danger ? Brand.danger : Brand.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.action, divided && styles.lineLeft, pressed && styles.pressed, disabled && styles.disabled]}>
      <MIcon name={icon} size={20} color={color} />
      <Text style={[styles.actionText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((Brand) => ({
  flex: {
    flex: 1,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
    overflow: 'hidden',
  },
  cardAccent: {
    borderColor: Brand.primary,
    backgroundColor: Brand.selected,
  },
  row: {
    flexDirection: 'row',
  },
  lineTop: {
    borderTopWidth: 1,
    borderTopColor: Brand.border,
  },
  lineLeft: {
    borderLeftWidth: 1,
    borderLeftColor: Brand.border,
  },
  pressed: {
    backgroundColor: Brand.surface,
  },
  disabled: {
    opacity: 0.45,
  },
  cell: {
    flex: 1,
    minHeight: 92,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 2,
  },
  value: {
    marginTop: 6,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  valueWarn: {
    color: Brand.danger,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.muted,
  },
  info: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconCol: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoValue: {
    marginTop: 1,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: Brand.text,
  },
  action: {
    flex: 1,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '800',
  },
}));
