import { useMemo, useRef, useState } from 'react';
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ArrowRight } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/pressable-scale';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { quantityText } from '@/lib/booking-format';
import { type Measure, QUANTITY } from '@/lib/catalog';
import { selectionHaptic } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import { enterAt } from '@/lib/motion';

/** The three amounts people order most, per measure: one tap jumps the wheel there. */
const PRESETS: Record<Measure, number[]> = {
  units: [1, 2, 3],
  bricks: [500, 1000, 2000],
  blocks: [100, 200, 500],
};
const ITEM = 64;

type AmountPickerProps = {
  measure: Measure;
  value: number;
  title: string;
  onChange: (value: number) => void;
  /** The amount is decided: move on. */
  onDone: () => void;
};

/**
 * Quantity without the keyboard: three quick amounts, and a number wheel
 * that scrolls sideways and snaps to every valid amount (so nothing can be
 * out of range and nothing on screen is hidden by a keyboard). The button
 * always states the amount in full.
 */
export function AmountPicker({ measure, value, title, onChange, onDone }: AmountPickerProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  const bounds = QUANTITY[measure];
  const amounts = useMemo(
    () => Array.from({ length: Math.floor((bounds.max - bounds.min) / bounds.step) + 1 }, (_, i) => bounds.min + i * bounds.step),
    [bounds]
  );
  const list = useRef<FlatList<number>>(null);
  const [width, setWidth] = useState(0);
  const side = Math.max(0, (width - ITEM) / 2);
  const indexOf = (amount: number) => Math.max(0, Math.min(amounts.length - 1, Math.round((amount - bounds.min) / bounds.step)));

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = amounts[Math.max(0, Math.min(amounts.length - 1, Math.round(e.nativeEvent.contentOffset.x / ITEM)))];
    if (next !== value) {
      selectionHaptic();
      onChange(next);
    }
  }

  function jump(amount: number) {
    selectionHaptic();
    onChange(amount);
    list.current?.scrollToOffset({ offset: indexOf(amount) * ITEM, animated: true });
  }

  return (
    <Animated.View entering={enterAt()} style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.presets}>
          {PRESETS[measure].map((preset) => (
            <Pressable
              key={preset}
              onPress={() => jump(preset)}
              accessibilityRole="button"
              accessibilityLabel={quantityText(t, measure, preset)}
              hitSlop={4}
              style={[styles.preset, value === preset && styles.presetOn]}>
              <Text style={[styles.presetText, value === preset && styles.presetTextOn]}>{preset.toLocaleString('en-IN')}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.wheel} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View pointerEvents="none" style={[styles.marker, { left: side }]} />
        {width > 0 && (
          <FlatList
            ref={list}
            data={amounts}
            horizontal
            keyExtractor={(n) => String(n)}
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: side }}
            getItemLayout={(_, index) => ({ length: ITEM, offset: ITEM * index, index })}
            initialScrollIndex={indexOf(value)}
            initialNumToRender={9}
            windowSize={5}
            onMomentumScrollEnd={onScrollEnd}
            onScrollEndDrag={onScrollEnd}
            accessibilityRole="adjustable"
            accessibilityLabel={title}
            accessibilityValue={{ text: quantityText(t, measure, value) }}
            renderItem={({ item }) => (
              <Pressable onPress={() => jump(item)} style={styles.item}>
                <Text style={[styles.number, item === value && styles.numberOn]} numberOfLines={1} adjustsFontSizeToFit>
                  {item.toLocaleString('en-IN')}
                </Text>
              </Pressable>
            )}
          />
        )}
      </View>

      <PressableScale onPress={onDone} accessibilityRole="button" style={styles.go}>
        <Text style={styles.goText} numberOfLines={1}>
          {quantityText(t, measure, value)}
        </Text>
        <ArrowRight size={20} color={Brand.onPrimary} strokeWidth={2.5} />
      </PressableScale>
    </Animated.View>
  );
}

const useStyles = makeStyles((Brand) => ({
  wrap: {
    gap: 10,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: Brand.text,
  },
  presets: {
    flexDirection: 'row',
    gap: 6,
  },
  preset: {
    minWidth: 40,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetOn: {
    borderColor: Brand.primary,
    backgroundColor: Brand.selected,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  presetTextOn: {
    color: Brand.link,
  },
  wheel: {
    height: 64,
    borderRadius: 18,
    backgroundColor: Brand.surface,
    overflow: 'hidden',
  },
  // The fixed window in the middle: whatever sits in it is the amount.
  marker: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    width: ITEM,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Brand.primary,
    backgroundColor: Brand.selected,
  },
  item: {
    width: ITEM,
    height: 64,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 20,
    fontWeight: '700',
    color: Brand.muted,
    fontVariant: ['tabular-nums'],
  },
  numberOn: {
    fontSize: 24,
    fontWeight: '800',
    color: Brand.text,
  },
  go: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Brand.primary,
  },
  goText: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
    color: Brand.onPrimary,
  },
}));
