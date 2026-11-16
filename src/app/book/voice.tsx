import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, type TextInputInstance, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOutUp,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type OrbMode, VoiceOrb } from '@/components/booking/voice-orb';
import { ArrowRight, Keyboard, Languages, Pencil, X } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/pressable-scale';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { BOOKING_PATH, type Site, useBooking } from '@/lib/booking';
import { quantityText } from '@/lib/booking-format';
import { getItem, type Item, ITEMS, pick, QUANTITY, searchItems } from '@/lib/catalog';
import { choiceHaptic, errorHaptic, selectionHaptic, successHaptic } from '@/lib/haptics';
import { asapBlockedUntil, DEFAULT_SCHEDULE } from '@/lib/schedule';
import { useSession } from '@/lib/session';
import { useSites } from '@/lib/sites';
import { type Answers, parseAll, parseQuantity, parseWhen, type Slot, SLOTS, type When } from '@/lib/voice';

/**
 * Voice booking (handoff C10): a guided conversation that fills the same
 * slots as the form — material, amount, pickup, drop, when. Each question is
 * read aloud; the customer answers by tapping a suggestion, typing, or the
 * mic on their keyboard (which handles Malayalam). Answers stack above as
 * editable chips. When every slot is filled it opens the truck step with the
 * draft ready; prices and confirmation stay on the normal screens (rule 3).
 */
export default function VoiceBooking() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t, language, setLanguage } = useSession();
  const { start, setQuantity, update } = useBooking();
  const { favourites } = useSites();
  const [answers, setAnswers] = useState<Answers>({});
  const [slot, setSlot] = useState<Slot>('material');
  const [text, setText] = useState('');
  const [mode, setMode] = useState<OrbMode>('idle');
  const [missed, setMissed] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);
  const [finished, setFinished] = useState(false);

  const item = getItem(answers.itemId);
  const question =
    slot === 'material'
      ? t('voiceAskMaterial')
      : slot === 'quantity'
        ? t('voiceAskQuantity', { material: item ? pick(item.name, language) : '' })
        : slot === 'pickup'
          ? t('voiceAskPickup')
          : slot === 'drop'
            ? t('voiceAskDrop')
            : t('voiceAskWhen');

  // Read each new question aloud in the chosen language; the orb pulses while it speaks.
  useEffect(() => {
    if (finished) return;
    Speech.stop().catch(() => {});
    Speech.speak(question, {
      language: language === 'ml' ? 'ml-IN' : 'en-IN',
      onStart: () => setMode('speaking'),
      onDone: () => setMode('idle'),
      onError: () => setMode('idle'),
    });
    return () => {
      Speech.stop().catch(() => {});
    };
  }, [question, language, finished]);

  function nextSlot(filled: Answers) {
    const next = SLOTS.find((s) => filled[slotKey(s)] === undefined);
    if (next) {
      setSlot(next);
      return;
    }
    finish(filled);
  }

  function accept(patch: Answers) {
    selectionHaptic();
    setMissed(false);
    setText('');
    const filled = { ...answers, ...patch };
    setAnswers(filled);
    nextSlot(filled);
  }

  function miss() {
    errorHaptic();
    setMissed(true);
  }

  function submitText() {
    const value = text.trim();
    if (!value) return;
    // A full sentence can answer several questions at once (and jump to the end).
    const all = parseAll(value, language);
    const filledCount = Object.keys(all).length;
    if (filledCount >= 2 || (filledCount === 1 && all[slotKey(slot)] === undefined && slot !== 'pickup' && slot !== 'drop')) {
      if (all.when?.mode === 'now' && asapBlockedUntil(new Date())) delete all.when;
      return accept(all);
    }
    if (slot === 'material') {
      const found = searchItems(value, language)[0];
      return found ? accept({ itemId: found.id }) : miss();
    }
    if (slot === 'quantity') {
      const n = parseQuantity(value);
      if (!n || !item) return miss();
      const bounds = QUANTITY[item.measure];
      return accept({ quantity: Math.min(bounds.max, Math.max(bounds.min, n)) });
    }
    if (slot === 'pickup' || slot === 'drop') {
      if (value.length < 3) return miss();
      const site: Site = { label: value, source: 'manual' };
      return accept(slot === 'pickup' ? { pickup: site } : { drop: site });
    }
    const when = parseWhen(value);
    return when ? acceptWhen(when) : miss();
  }

  function acceptWhen(when: When) {
    if (when.mode === 'now' && asapBlockedUntil(new Date())) return miss();
    accept({ when });
  }

  function finish(filled: Answers) {
    const chosen = getItem(filled.itemId);
    if (!chosen || !filled.quantity || !filled.pickup || !filled.drop || !filled.when) return;
    setFinished(true);
    setMode('done');
    successHaptic();
    Speech.stop().catch(() => {});
    Speech.speak(t('voiceDone'), { language: language === 'ml' ? 'ml-IN' : 'en-IN' });
    start({ itemId: chosen.id });
    setQuantity(filled.quantity);
    update({
      pickup: filled.pickup,
      delivery: filled.drop,
      when: filled.when.mode === 'now' ? { mode: 'now' } : { mode: 'schedule', ...DEFAULT_SCHEDULE },
    });
    // Open the normal steps underneath so Back walks them, landing on the truck choice.
    setTimeout(() => {
      router.back();
      [...BOOKING_PATH, '/book/truck' as const].forEach((path) => router.push(path));
    }, 900);
  }

  const suggestions: { label: string; onPress: () => void }[] =
    slot === 'material'
      ? ITEMS.slice(0, 8).map((i: Item) => ({ label: pick(i.name, language), onPress: () => accept({ itemId: i.id }) }))
      : slot === 'quantity' && item
        ? (item.measure === 'units' ? [1, 2, 3, 5] : item.measure === 'bricks' ? [500, 1000, 2000, 3000] : [100, 200, 500, 1000]).map((n) => ({
            label: quantityText(t, item.measure, n).split(' · ')[0],
            onPress: () => accept({ quantity: n }),
          }))
        : slot === 'pickup' || slot === 'drop'
          ? favourites.slice(0, 4).map((site) => ({
              label: site.label.split(',')[0],
              onPress: () => {
                const chosen: Site = { label: site.label, source: 'saved', coords: site.coords };
                accept(slot === 'pickup' ? { pickup: chosen } : { drop: chosen });
              },
            }))
          : [
              { label: t('nowShort'), onPress: () => acceptWhen({ mode: 'now' }) },
              { label: t('tomorrow'), onPress: () => acceptWhen({ mode: 'tomorrow' }) },
            ];

  const done: { slot: Slot; label: string }[] = SLOTS.filter((s) => answers[slotKey(s)] !== undefined && s !== slot).map((s) => ({
    slot: s,
    label:
      s === 'material'
        ? pick(item!.name, language)
        : s === 'quantity' && item
          ? quantityText(t, item.measure, answers.quantity!).split(' · ')[0]
          : s === 'pickup'
            ? answers.pickup!.label.split(',')[0]
            : s === 'drop'
              ? answers.drop!.label.split(',')[0]
              : answers.when!.mode === 'now'
                ? t('nowShort')
                : t('tomorrow'),
  }));

  const filledSlots = SLOTS.filter((s) => answers[slotKey(s)] !== undefined).length;

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(220)} style={styles.scrim}>
        <Pressable style={styles.flex} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('close')} />
      </Animated.View>
      <SafeAreaView style={styles.sheet} edges={['bottom']}>
      <EdgeGlow on={mode === 'listening'} />
      <View style={styles.grabber} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('close')} hitSlop={8} style={styles.round}>
          <X size={22} color={Brand.text} strokeWidth={2.25} />
        </Pressable>
        <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: SLOTS.length, now: filledSlots }}>
          {SLOTS.map((s, i) => (
            <View key={s} style={[styles.segment, i < filledSlots && styles.segmentOn]} />
          ))}
        </View>
        <Pressable
          onPress={() => {
            choiceHaptic();
            setLanguage(language === 'en' ? 'ml' : 'en');
          }}
          accessibilityRole="button"
          accessibilityLabel={language === 'en' ? 'മലയാളം' : 'English'}
          style={styles.langChip}>
          <Languages size={16} color={Brand.link} strokeWidth={2.25} />
          <Text style={styles.langText}>{language === 'en' ? 'മലയാളം' : 'English'}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {done.length > 0 && (
            <Animated.View layout={LinearTransition.duration(220)} style={styles.done}>
              {done.map((d) => (
                <Animated.View key={d.slot} entering={FadeIn.duration(220)} layout={LinearTransition.duration(220)}>
                  <Pressable
                    onPress={() => {
                      selectionHaptic();
                      setSlot(d.slot);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('change')} ${d.label}`}
                    style={styles.doneChip}>
                    <Text style={styles.doneText} numberOfLines={1}>
                      {d.label}
                    </Text>
                    <Pencil size={12} color={Brand.link} strokeWidth={2.5} />
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          )}

          <View style={styles.questionBox} accessibilityLiveRegion="polite">
            <Animated.Text
              key={finished ? 'done' : question}
              entering={FadeInDown.duration(320)}
              exiting={FadeOutUp.duration(160)}
              style={styles.question}
              accessibilityRole="header">
              {finished ? t('voiceDone') : question}
            </Animated.Text>
            {!finished && text.trim() !== '' && <Text style={styles.transcript}>{text}</Text>}
            {!finished && slot === 'material' && done.length === 0 && text === '' && (
              <Animated.Text entering={FadeIn.delay(400).duration(300)} style={styles.example}>
                {t('voiceExample')}
              </Animated.Text>
            )}
          </View>
          {missed && (
            <Animated.Text entering={FadeInUp.duration(200)} style={styles.missed}>
              {slot === 'when' && asapBlockedUntil(new Date()) ? t('asapNowBlocked') : t('voiceNotUnderstood')}
            </Animated.Text>
          )}

          {!finished && (
            <View style={styles.suggestions}>
              {suggestions.map((s, i) => (
                <Animated.View key={`${slot}-${s.label}`} entering={FadeInDown.delay(80 + i * 40).duration(260)}>
                  <PressableScale onPress={s.onPress} accessibilityRole="button" style={styles.suggestion}>
                    <Text style={styles.suggestionText} numberOfLines={1}>
                      {s.label}
                    </Text>
                  </PressableScale>
                </Animated.View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.dock}>
          <Pressable
            onPress={() => inputRef.current?.focus()}
            accessibilityRole="button"
            accessibilityLabel={t('voiceTapToSpeak')}
            style={styles.orb}>
            <VoiceOrb mode={mode} />
          </Pressable>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              onFocus={() => setMode('listening')}
              onBlur={() => setMode('idle')}
              onSubmitEditing={submitText}
              returnKeyType="send"
              placeholder={t('voiceTypeHere')}
              placeholderTextColor={Brand.muted}
              accessibilityLabel={t('voiceTypeHere')}
              style={styles.input}
            />
            <PressableScale
              onPress={submitText}
              disabled={!text.trim()}
              accessibilityRole="button"
              accessibilityLabel={t('voiceSend')}
              style={[styles.send, !text.trim() && styles.sendOff]}>
              <ArrowRight size={22} color={Brand.onPrimary} strokeWidth={2.5} />
            </PressableScale>
          </View>
          <View style={styles.hint}>
            <Keyboard size={14} color={Brand.muted} strokeWidth={2} />
            <Text style={styles.hintText}>{t('voiceKeyboardMic')}</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/** While listening, the screen's edge glows orange and slowly breathes, as Siri does. */
function EdgeGlow({ on }: { on: boolean }) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.set(
      on && !reduced
        ? withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true)
        : withTiming(0, { duration: 300 })
    );
  }, [on, reduced, glow]);
  const style = useAnimatedStyle(() => ({ opacity: on ? 0.45 + glow.value * 0.55 : glow.value }));
  return <Animated.View pointerEvents="none" style={[styles.edge, style]} />;
}

function slotKey(slot: Slot): keyof Answers {
  return slot === 'material' ? 'itemId' : slot === 'drop' ? 'drop' : slot;
}

const useStyles = makeStyles((Brand) => ({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 25, 23, 0.45)',
  },
  // Rises from the bottom and keeps the page behind in view, as Siri does.
  sheet: {
    height: '74%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Brand.card,
    overflow: 'hidden',
  },
  grabber: {
    alignSelf: 'center',
    marginTop: 8,
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Brand.border,
  },
  flex: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.border,
  },
  segmentOn: {
    backgroundColor: Brand.primary,
  },
  edge: {
    ...StyleSheet.absoluteFill,
    borderWidth: 4,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderColor: Brand.primary,
    zIndex: 10,
  },
  langChip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Brand.selected,
  },
  langText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.link,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  done: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  doneChip: {
    maxWidth: 200,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Brand.selected,
  },
  doneText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Brand.link,
  },
  orb: {
    alignSelf: 'center',
    marginBottom: 4,
  },
  questionBox: {
    marginTop: 20,
    minHeight: 96,
  },
  question: {
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: Brand.text,
  },
  transcript: {
    marginTop: 10,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '600',
    color: Brand.link,
  },
  example: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: Brand.muted,
  },
  missed: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: Brand.danger,
  },
  suggestions: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestion: {
    minHeight: 44,
    maxWidth: 220,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
  },
  suggestionText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.text,
  },
  dock: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Brand.surface,
    fontSize: 16,
    color: Brand.text,
    outlineWidth: 0,
  },
  send: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: {
    opacity: 0.4,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.muted,
  },
}));
