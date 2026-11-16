import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { type LucideIcon, Sun, Sunrise, Sunset } from '@/components/ui/icons';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { selectionHaptic } from '@/lib/haptics';
import type { Language } from '@/lib/i18n';
import { DATE_CHOICES, dayFromNow, formatMinutes, restrictedWindowAt, type ScheduleInput } from '@/lib/schedule';
import { useSession } from '@/lib/session';

type Part = 'morning' | 'afternoon' | 'evening';

/** Half-hour start times per part of the day; school-hour windows are left out entirely. */
const PART_RANGE: Record<Part, [number, number]> = {
  morning: [6 * 60, 12 * 60],
  afternoon: [12 * 60, 17 * 60 + 30],
  evening: [17 * 60 + 30, 20 * 60 + 30],
};
const PARTS: { id: Part; icon: LucideIcon }[] = [
  { id: 'morning', icon: Sunrise },
  { id: 'afternoon', icon: Sun },
  { id: 'evening', icon: Sunset },
];

function slotsFor(part: Part) {
  const [from, to] = PART_RANGE[part];
  const slots: number[] = [];
  for (let m = from; m < to; m += 30) if (!restrictedWindowAt(m)) slots.push(m);
  return slots;
}

function toMinutes(value: ScheduleInput) {
  const hour = Number(value.hour);
  const minute = Number(value.minute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return ((hour % 12) + (value.meridiem === 'PM' ? 12 : 0)) * 60 + minute;
}

function toInput(dayOffset: number, minutes: number): ScheduleInput {
  const h24 = Math.floor(minutes / 60);
  return {
    dayOffset,
    hour: String(((h24 + 11) % 12) + 1),
    minute: String(minutes % 60).padStart(2, '0'),
    meridiem: h24 < 12 ? 'AM' : 'PM',
  };
}

function partOf(minutes: number | null): Part {
  if (minutes === null || minutes < PART_RANGE.afternoon[0]) return 'morning';
  return minutes < PART_RANGE.evening[0] ? 'afternoon' : 'evening';
}

function dayParts(language: Language, date: Date) {
  const locale = language === 'ml' ? 'ml-IN' : 'en-IN';
  try {
    return {
      weekday: date.toLocaleDateString(locale, { weekday: 'short' }),
      day: date.toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
    };
  } catch {
    return { weekday: '', day: date.toDateString() };
  }
}

type SchedulePickerProps = {
  value: ScheduleInput;
  now: Date;
  onChange: (value: ScheduleInput) => void;
  /** A time slot was tapped (not just a day or part of the day): the choice is complete. */
  onSlotPicked?: (value: ScheduleInput) => void;
};

/**
 * Handoff C07 scheduling as taps, not typing: seven day chips from today,
 * a morning / afternoon / evening switch, then half-hour slots. School-hour
 * slots never appear and past slots today are greyed out, so every choice
 * that can be made is valid.
 */
export function SchedulePicker({ value, now, onChange, onSlotPicked }: SchedulePickerProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const { t, language } = useSession();
  const selected = toMinutes(value);
  const [part, setPart] = useState<Part>(partOf(selected));
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isPast = (minutes: number) => value.dayOffset === 0 && minutes <= nowMinutes;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
        {Array.from({ length: DATE_CHOICES }, (_, offset) => {
          const date = dayFromNow(offset, now);
          const parts = dayParts(language, date);
          const on = value.dayOffset === offset;
          const top = offset === 0 ? t('today') : offset === 1 ? t('tomorrow') : parts.weekday;
          return (
            <Pressable
              key={offset}
              onPress={() => {
                selectionHaptic();
                onChange({ ...value, dayOffset: offset });
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${top}, ${parts.day}`}
              style={[styles.day, on && styles.dayOn]}>
              <Text style={[styles.dayTop, on && styles.textOn]}>{top}</Text>
              <Text style={[styles.dayDate, on && styles.textOnSoft]}>{parts.day}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.parts} accessibilityRole="tablist">
        {PARTS.map(({ id, icon: Icon }) => {
          const on = part === id;
          return (
            <Pressable
              key={id}
              onPress={() => {
                selectionHaptic();
                setPart(id);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.part, on && styles.partOn]}>
              <Icon size={18} color={on ? Brand.onPrimary : Brand.muted} strokeWidth={on ? 2.25 : 1.75} />
              <Text style={[styles.partText, on && styles.partTextOn]} numberOfLines={1}>
                {t(id)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Animated.View key={part} entering={FadeIn.duration(180)} layout={LinearTransition} style={styles.slots} accessibilityRole="radiogroup">
        {slotsFor(part).map((minutes) => {
          const past = isPast(minutes);
          const on = selected === minutes;
          return (
            <Pressable
              key={minutes}
              disabled={past}
              onPress={() => {
                selectionHaptic();
                const next = toInput(value.dayOffset, minutes);
                onChange(next);
                onSlotPicked?.(next);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: past }}
              style={[styles.slot, on && styles.slotOn, past && styles.slotPast]}>
              <Text style={[styles.slotText, on && styles.textOn, past && styles.slotTextPast]}>{formatMinutes(minutes)}</Text>
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  wrap: {
    gap: 12,
  },
  days: {
    gap: 8,
    paddingRight: 8,
  },
  day: {
    width: 72,
    height: 60,
    borderRadius: 14,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: {
    backgroundColor: Brand.primary,
  },
  dayTop: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.text,
  },
  dayDate: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
    color: Brand.muted,
  },
  textOn: {
    color: Brand.onPrimary,
  },
  textOnSoft: {
    color: Brand.onPrimary,
    opacity: 0.75,
  },
  parts: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    backgroundColor: Brand.surface,
  },
  part: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  partOn: {
    backgroundColor: Brand.card,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  partText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.muted,
  },
  partTextOn: {
    fontWeight: '700',
    color: Brand.text,
  },
  slots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slot: {
    width: '31.5%',
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotOn: {
    borderColor: Brand.primary,
    backgroundColor: Brand.primary,
  },
  slotPast: {
    borderStyle: 'dashed',
    backgroundColor: Brand.surface,
  },
  slotText: {
    fontSize: 15,
    fontWeight: '600',
    color: Brand.text,
  },
  slotTextPast: {
    color: '#C4BEB8',
  },
}));
