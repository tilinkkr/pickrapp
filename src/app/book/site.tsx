import { router } from 'expo-router';
import { useRef } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { BookingLayout } from '@/components/booking/booking-layout';
import { SchedulePicker } from '@/components/booking/schedule-picker';
import { CheckCircle2, School, TriangleAlert } from '@/components/ui/icons';
import { IconChip, type MIconName } from '@/components/ui/m-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { useBooking } from '@/lib/booking';
import { choiceHaptic, successHaptic } from '@/lib/haptics';
import { asapBlockedUntil, checkSchedule, DEFAULT_SCHEDULE, type ScheduleInput } from '@/lib/schedule';
import { useSession } from '@/lib/session';
import { formatWhen, useNow } from '@/lib/trip-format';

/** Long enough to see the choice land before the next step slides in. */
const ADVANCE_MS = 420;

/**
 * Step 3 of 5 (handoff C07): only "when". No Continue button: tapping Now
 * (outside school hours) or a time slot completes the step and the truck
 * step slides in. Notes and the transit pass are on the review step.
 */
export default function WhenStep() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t, language } = useSession();
  const { draft, update } = useBooking();
  const now = new Date(useNow(30_000));
  const leaving = useRef(false);

  const scheduling = draft.when.mode === 'schedule';
  const schedule = draft.when.mode === 'schedule' ? draft.when : DEFAULT_SCHEDULE;
  const check = checkSchedule(schedule, now);
  const asapUntil = asapBlockedUntil(now);

  function advance() {
    if (leaving.current) return;
    leaving.current = true;
    successHaptic();
    setTimeout(() => {
      leaving.current = false;
      router.push('/book/truck');
    }, ADVANCE_MS);
  }

  function pickSlot(next: ScheduleInput) {
    if (checkSchedule(next, now).ok) advance();
  }

  return (
    <BookingLayout title={t('whenTitle')} step={3}>
      <Text style={styles.h1} accessibilityRole="header">
        {t('whenNeeded')}
      </Text>

      <View style={styles.choices} accessibilityRole="radiogroup">
        <Choice
          icon={asapUntil ? 'lock-outline' : 'truck-fast'}
          title={t('nowShort')}
          sub={asapUntil ? t('fromTime', { time: asapUntil }) : t('earliestTruck')}
          selected={!scheduling}
          blocked={!!asapUntil}
          onPress={() => {
            update({ when: { mode: 'now' } });
            if (!asapUntil) advance();
          }}
        />
        <Choice
          icon="calendar-clock"
          title={t('laterShort')}
          sub={scheduling && check.ok ? formatWhen(language, check.date) : t('pickSlot')}
          selected={scheduling}
          onPress={() => update({ when: { mode: 'schedule', ...schedule } })}
        />
      </View>

      <View style={styles.school}>
        <School size={16} color={Brand.link} strokeWidth={2} />
        <Text style={styles.schoolText}>{t('schoolHoursShort')}</Text>
      </View>

      {scheduling && (
        <Animated.View entering={FadeInDown.duration(260)} exiting={FadeOut.duration(120)} style={styles.picker}>
          <SchedulePicker
            value={schedule}
            now={now}
            onChange={(next) => update({ when: { mode: 'schedule', ...next } })}
            onSlotPicked={pickSlot}
          />
          {check.ok ? (
            <View style={styles.status}>
              <CheckCircle2 size={18} color={Brand.success} strokeWidth={2.25} />
              <Text style={[styles.statusText, styles.ok]}>{formatWhen(language, check.date)}</Text>
            </View>
          ) : (
            <View style={styles.status} accessibilityRole="alert">
              <TriangleAlert size={18} color={Brand.danger} strokeWidth={2.25} />
              <Text style={[styles.statusText, styles.bad]}>
                {check.reason === 'past' ? t('timePast') : check.reason === 'restricted' ? t('timeRestricted') : t('pickSlot')}
              </Text>
            </View>
          )}
        </Animated.View>
      )}
    </BookingLayout>
  );
}

function Choice({
  icon,
  title,
  sub,
  selected,
  blocked,
  onPress,
}: {
  icon: MIconName;
  title: string;
  sub: string;
  selected: boolean;
  blocked?: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <PressableScale
      onPress={() => {
        choiceHaptic();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}, ${sub}`}
      style={[styles.choice, selected && styles.choiceOn, selected && blocked && styles.choiceBlocked]}>
      <IconChip name={icon} size={46} tone={selected ? 'solid' : 'neutral'} />
      <View style={styles.choiceText}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={[styles.choiceSub, selected && blocked && styles.bad]} numberOfLines={2}>
          {sub}
        </Text>
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.radioDot} />}</View>
    </PressableScale>
  );
}

const useStyles = makeStyles((Brand) => ({
  h1: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    color: Brand.text,
  },
  // Two full-width rows, one decision: now, or a chosen time.
  choices: {
    marginTop: 16,
    gap: 10,
  },
  choice: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
  },
  choiceOn: {
    borderColor: Brand.primary,
    backgroundColor: Brand.selected,
  },
  choiceBlocked: {
    borderColor: Brand.danger,
    backgroundColor: Brand.dangerFill,
  },
  choiceText: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.text,
  },
  choiceSub: {
    marginTop: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Brand.muted,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: Brand.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Brand.primary,
  },
  school: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Brand.selected,
  },
  schoolText: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.link,
  },
  picker: {
    marginTop: 20,
    gap: 12,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  ok: {
    color: Brand.success,
  },
  bad: {
    color: Brand.danger,
  },
}));
