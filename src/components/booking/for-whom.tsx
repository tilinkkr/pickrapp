import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { GlassCard, GlassRule } from '@/components/ui/glass';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ChevronDown } from '@/components/ui/icons';
import { MIcon, type MIconName } from '@/components/ui/m-icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { errorHaptic, selectionHaptic, tapHaptic } from '@/lib/haptics';
import { enterAt, popIn } from '@/lib/motion';
import { formatIndianMobile, isValidIndianMobile } from '@/lib/otp';
import { firstName, type OtherPerson, useRecentPeople } from '@/lib/people';
import { useSession } from '@/lib/session';

/**
 * "For me ▾" / "For Anu ▾": who the booking is for, one tap from the route
 * step (Uber's rider switch). Filled in orange once it is someone else, so it
 * is never missed.
 */
export function ForWhomChip({ person, onPress }: { person?: OtherPerson | null; onPress: () => void }) {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  const label = person ? t('forName', { name: firstName(person.name) }) : t('forMe');
  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${t('whoIsThisFor')}`}
      hitSlop={6}
      style={({ pressed }) => [styles.chip, person && styles.chipOn, pressed && styles.pressed]}>
      <MIcon name={person ? 'account-arrow-right' : 'account-outline'} size={18} color={person ? Brand.link : Brand.text} />
      <Text style={[styles.chipText, person && styles.chipTextOn]} numberOfLines={1}>
        {label}
      </Text>
      <ChevronDown size={16} color={person ? Brand.link : Brand.text} strokeWidth={2.5} />
    </Pressable>
  );
}

type ForWhomSheetProps = {
  visible: boolean;
  person?: OtherPerson | null;
  onClose: () => void;
  /** `null` means "for me". */
  onDone: (person: OtherPerson | null) => void;
};

/** The choice itself: me, someone booked for before, or someone new (name, number, where they meet, who pays). */
export function ForWhomSheet({ visible, person, onClose, onDone }: ForWhomSheetProps) {
  const { t } = useSession();
  return (
    <BottomSheet visible={visible} title={t('whoIsThisFor')} closeLabel={t('close')} onClose={onClose}>
      {/* Mounted per opening, so it always starts from the booking's current choice. */}
      {visible && <ForWhomForm person={person} onDone={onDone} />}
    </BottomSheet>
  );
}

function ForWhomForm({ person, onDone }: { person?: OtherPerson | null; onDone: (person: OtherPerson | null) => void }) {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  const recent = useRecentPeople();
  const [mode, setMode] = useState<'me' | 'other'>(person ? 'other' : 'me');
  const [name, setName] = useState(person?.name ?? '');
  const [phone, setPhone] = useState(person?.phone ?? '');
  const [meets, setMeets] = useState<OtherPerson['meets']>(person?.meets ?? 'drop');
  const [pays, setPays] = useState<OtherPerson['pays']>(person?.pays ?? 'me');
  const [tried, setTried] = useState(false);

  const nameOk = name.trim().length >= 2;
  const phoneOk = isValidIndianMobile(phone);
  const fromRecent = recent.find((p) => p.phone === phone && mode === 'other');

  function choose(next: 'me' | 'other', fill?: OtherPerson) {
    selectionHaptic();
    setMode(next);
    setTried(false);
    if (fill) {
      setName(fill.name);
      setPhone(fill.phone);
      setMeets(fill.meets);
      setPays(fill.pays);
    } else if (next === 'other' && fromRecent) {
      // "Someone else" after picking a recent person starts a fresh, empty form.
      setName('');
      setPhone('');
    }
  }

  function done() {
    if (mode === 'me') return onDone(null);
    setTried(true);
    if (!nameOk || !phoneOk) {
      errorHaptic();
      return;
    }
    selectionHaptic();
    onDone({ name: name.trim().replace(/\s+/g, ' '), phone, meets, pays });
  }

  return (
    <View style={styles.form}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <GlassCard>
          <ChoiceRow icon="account-outline" title={t('bookingForMe')} sub={t('bookingForMeSub')} selected={mode === 'me'} onPress={() => choose('me')} />
          {recent.map((p) => (
            <ChoiceRow
              key={p.phone}
              divided
              icon="account-clock-outline"
              title={p.name}
              sub={formatIndianMobile(p.phone)}
              selected={mode === 'other' && phone === p.phone}
              onPress={() => choose('other', p)}
            />
          ))}
          <ChoiceRow
            divided
            icon="account-plus-outline"
            title={t('someoneElse')}
            sub={t('someoneElseSub')}
            selected={mode === 'other' && !fromRecent}
            onPress={() => choose('other')}
          />
        </GlassCard>

        {mode === 'other' && (
          <Animated.View entering={enterAt()} style={styles.details}>
            <Text style={styles.label}>{t('personName')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Anu Thomas"
              placeholderTextColor="#A8A29E"
              autoCapitalize="words"
              autoComplete="off"
              textContentType="none"
              maxLength={60}
              accessibilityLabel={t('personName')}
              style={[styles.input, tried && !nameOk && styles.inputBad]}
            />
            {tried && !nameOk && <Text style={styles.error}>{t('nameNeeded')}</Text>}

            <Text style={styles.label}>{t('personPhone')}</Text>
            <View style={[styles.phone, tried && !phoneOk && styles.inputBad]}>
              <Text style={styles.prefix}>+91</Text>
              <View style={styles.prefixLine} />
              <TextInput
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').slice(0, 10))}
                placeholder="98470 12345"
                placeholderTextColor="#A8A29E"
                keyboardType="phone-pad"
                autoComplete="off"
                textContentType="none"
                maxLength={14}
                accessibilityLabel={t('personPhone')}
                style={styles.phoneInput}
              />
            </View>
            {tried && !phoneOk && <Text style={styles.error}>{t('phoneNeeded')}</Text>}

            <Text style={styles.label}>{t('meetsAt')}</Text>
            <Segmented
              value={meets}
              onChange={setMeets}
              options={[
                { value: 'drop', label: t('meetsAtDrop'), icon: 'flag-checkered' },
                { value: 'pickup', label: t('meetsAtPickup'), icon: 'map-marker-outline' },
                { value: 'both', label: t('meetsAtBoth'), icon: 'swap-vertical' },
              ]}
            />

            <Text style={styles.label}>{t('whoPays')}</Text>
            <Segmented
              value={pays}
              onChange={setPays}
              options={[
                { value: 'me', label: t('paysMe'), icon: 'account-outline' },
                { value: 'them', label: t('paysThem'), icon: 'account-cash-outline' },
              ]}
            />

            <View style={styles.note}>
              <MIcon name="shield-account-outline" size={18} color={Brand.muted} />
              <Text style={styles.noteText}>{t('shareNumberNote')}</Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
      <PrimaryButton label={t('doneWord')} onPress={done} />
    </View>
  );
}

function ChoiceRow({
  icon,
  title,
  sub,
  selected,
  divided,
  onPress,
}: {
  icon: MIconName;
  title: string;
  sub: string;
  selected: boolean;
  divided?: boolean;
  onPress: () => void;
}) {
  const Brand = useBrand();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${sub}`}
      style={({ pressed }) => [styles.choice, pressed && styles.pressedRow]}>
      <View style={[styles.choiceIcon, selected && styles.choiceIconOn]}>
        <MIcon name={icon} size={22} color={selected ? Brand.link : Brand.text} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.choiceTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.choiceSub} numberOfLines={2}>
          {sub}
        </Text>
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <Animated.View entering={popIn()} style={styles.radioDot} />}</View>
      {divided && <GlassRule />}
    </Pressable>
  );
}

function Segmented<V extends string>({
  value,
  onChange,
  options,
}: {
  value: V;
  onChange: (value: V) => void;
  options: { value: V; label: string; icon: MIconName }[];
}) {
  const Brand = useBrand();
  const styles = useStyles();
  return (
    <View style={styles.segments} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (on) return;
              selectionHaptic();
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={[styles.segment, on && styles.segmentOn]}>
            <MIcon name={o.icon} size={18} color={on ? Brand.link : Brand.muted} />
            <Text style={[styles.segmentText, on && styles.segmentTextOn]} numberOfLines={2}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  chip: {
    alignSelf: 'flex-start',
    height: 40,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
  },
  chipOn: {
    borderColor: Brand.primary,
    backgroundColor: Brand.selected,
  },
  chipText: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Brand.text,
  },
  chipTextOn: {
    color: Brand.link,
  },
  form: {
    marginTop: 8,
    gap: 12,
  },
  scroll: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  choice: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pressedRow: {
    backgroundColor: Brand.surface,
  },
  choiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceIconOn: {
    backgroundColor: Brand.selected,
  },
  choiceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.text,
  },
  choiceSub: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 18,
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
  details: {
    marginTop: 4,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '800',
    color: Brand.text,
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    fontSize: 17,
    color: Brand.text,
    outlineWidth: 0,
  },
  inputBad: {
    borderColor: Brand.danger,
  },
  error: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: Brand.danger,
  },
  phone: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  prefix: {
    paddingLeft: 16,
    paddingRight: 12,
    fontSize: 17,
    fontWeight: '700',
    color: Brand.text,
  },
  prefixLine: {
    width: 1,
    height: 24,
    backgroundColor: Brand.border,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 17,
    letterSpacing: 0.5,
    color: Brand.text,
    outlineWidth: 0,
  },
  segments: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Brand.border,
  },
  segmentOn: {
    borderColor: Brand.primary,
    backgroundColor: Brand.selected,
  },
  segmentText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Brand.text,
  },
  segmentTextOn: {
    color: Brand.link,
  },
  note: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Brand.muted,
  },
}));
