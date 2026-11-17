import { Children, createContext, isValidElement, type ReactNode, useContext } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { MIcon, type MIconName } from '@/components/ui/m-icon';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { enterAt, fadeAt, ruleIn, STAGGER_MS } from '@/lib/motion';

/**
 * The app's grid: one outlined card, rows and cells split by 1 px lines that
 * all meet the card's edge, the same 16 px inset everywhere, icons in one
 * fixed 40 px column so text starts on the same line down the card.
 *
 * Solid surfaces only (2026-11-14): white card on a white page, or the
 * `accent` tone (orange outline, pale orange fill) for the one grid on a
 * page that matters most. The file and export names are kept from the
 * earlier glass version.
 *
 * How a grid loads (2026-11-17), as one piece of choreography:
 * 1. the card fades in and rises 8 px, in page order (`index`), 60 ms after
 *    the card above it;
 * 2. its rows fade in one after another, 40 ms apart, riding on the card's
 *    entrance (Swiggy's "children follow the parent");
 * 3. each dividing line rules itself in from its start edge as its row
 *    arrives, like lines drawn in a ledger.
 * Opacity and transform only, on the Base decelerate curve, so nothing
 * moves the layout and nothing overshoots. It plays once, when the grid
 * mounts; live updates inside it never replay it.
 */

/** When a card in page order starts to arrive. */
export const cardDelay = (index: number) => 40 + index * 60;

type RowTiming = { index: number; base: number; animate: boolean };
const RowContext = createContext<RowTiming>({ index: 0, base: 0, animate: false });

type GlassCardProps = {
  children: ReactNode;
  accent?: boolean;
  /** Position on the page; the card then makes its own entrance, `cardDelay(index)` after the page opens. */
  index?: number;
  /** Turn the row cascade off (e.g. a grid that is rebuilt on every tick). */
  still?: boolean;
};

export function GlassCard({ children, accent, index, still }: GlassCardProps) {
  const styles = useStyles();
  const base = (index !== undefined ? cardDelay(index) : 0) + 60;
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <Animated.View entering={index !== undefined && !still ? enterAt(0, cardDelay(index)) : undefined} style={[styles.card, accent && styles.cardAccent]}>
      {rows.map((row, i) => (
        <RowContext.Provider key={row.key ?? i} value={{ index: i, base, animate: !still }}>
          <Animated.View entering={still ? undefined : fadeAt(i, base)}>{row}</Animated.View>
        </RowContext.Provider>
      ))}
    </Animated.View>
  );
}

/**
 * A 1 px line on the row's top edge (`x`) or the cell's left edge (`y`) that
 * rules itself in as the row arrives. Exported for custom rows inside a
 * GlassCard (choice lists), so every divider in the app draws the same way.
 */
export function GlassRule({ axis = 'x' }: { axis?: 'x' | 'y' }) {
  const styles = useStyles();
  const { index, base, animate } = useContext(RowContext);
  return (
    <Animated.View
      pointerEvents="none"
      entering={animate ? ruleIn(index, base + STAGGER_MS, axis) : undefined}
      style={axis === 'x' ? styles.ruleTop : styles.ruleLeft}
    />
  );
}

/** A row of equal cells. `divided` draws the line above it (every row after the first). */
export function GlassRow({ children, divided = true }: { children: ReactNode; divided?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      {children}
      {divided && <GlassRule />}
    </View>
  );
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
      {divided && <GlassRule axis="y" />}
    </>
  );
  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}>
      {body}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.cell}>
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
    <View style={styles.info}>
      <View style={styles.iconCol}>
        <MIcon name={icon} size={22} color={Brand.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      {trailing}
      {divided && <GlassRule />}
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
      style={({ pressed }) => [styles.action, pressed && styles.pressed, disabled && styles.disabled]}>
      <MIcon name={icon} size={20} color={color} />
      <Text style={[styles.actionText, { color }]} numberOfLines={1}>
        {label}
      </Text>
      {divided && <GlassRule axis="y" />}
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
  // The dividing lines: drawn on top of the row so they reach the card edge, and grow from their start edge.
  ruleTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Brand.border,
    transformOrigin: 'left',
  },
  ruleLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 1,
    backgroundColor: Brand.border,
    transformOrigin: 'top',
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
