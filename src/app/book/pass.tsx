import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BookingLayout } from '@/components/booking/booking-layout';
import { Camera, Check, ImageIcon } from '@/components/ui/icons';
import { MIcon } from '@/components/ui/m-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { PrimaryButton } from '@/components/ui/primary-button';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { passReady, useBooking } from '@/lib/booking';
import { selectionHaptic, successHaptic } from '@/lib/haptics';
import { useSession } from '@/lib/session';

const MIN_PASS = 6;
/** DEMO: no upload service yet; the photo stays on the phone and this bar stands in for the upload. */
const UPLOAD_MS = 900;

/**
 * Transit pass (step 5 of 6, only for sand, jelly and soil): the KOMPAS pass
 * number and a clear photo of the pass. Review stays locked until both are
 * in, so no load leaves without its pass.
 */
export default function PassStep() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  const { draft, update } = useBooking();
  const [uploading, setUploading] = useState(false);
  const progress = useSharedValue(draft.transitPassPhoto ? 1 : 0);
  const number = draft.transitPass;
  const numberOk = number.trim().length >= MIN_PASS;
  const ready = passReady(draft) && !uploading;

  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  function finishUpload() {
    setUploading(false);
    successHaptic();
  }

  async function pick(source: 'camera' | 'library') {
    selectionHaptic();
    const permission =
      source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    update({ transitPassPhoto: result.assets[0].uri });
    setUploading(true);
    progress.set(0);
    progress.set(
      withTiming(1, { duration: UPLOAD_MS, easing: Easing.out(Easing.cubic) }, (done) => {
        if (done) scheduleOnRN(finishUpload);
      })
    );
  }

  // Coming back to this step with a photo already in place shows it as uploaded.
  useEffect(() => {
    if (draft.transitPassPhoto && !uploading) progress.set(1);
  }, [draft.transitPassPhoto, uploading, progress]);

  return (
    <BookingLayout
      title={t('truckPass')}
      step={5}
      footer={<PrimaryButton label={t('continueToReview')} disabled={!ready} onPress={() => router.push('/book/review')} />}>
      <Animated.View entering={FadeInDown.duration(260)}>
        <Text style={styles.h1} accessibilityRole="header">
          {t('passTitle')}
        </Text>
        <Text style={styles.sub}>{t('passSub')}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(260)} style={styles.card}>
        <Text style={styles.label}>{t('passNumber')}</Text>
        <View style={[styles.field, numberOk && styles.fieldOk]}>
          <MIcon name="file-document-outline" size={22} color={numberOk ? Brand.link : Brand.muted} />
          <TextInput
            value={number}
            onChangeText={(v) => update({ transitPass: v.toUpperCase().replace(/[^A-Z0-9/-]/g, '') })}
            placeholder="KOMPAS/2026/…"
            placeholderTextColor={Brand.muted}
            autoCapitalize="characters"
            maxLength={40}
            accessibilityLabel={t('passNumber')}
            style={styles.input}
          />
          {numberOk && <Check size={20} color={Brand.success} strokeWidth={3} />}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(260)} style={styles.card}>
        <Text style={styles.label}>{t('passPhoto')}</Text>
        {draft.transitPassPhoto ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.preview}>
            <Image source={{ uri: draft.transitPassPhoto }} style={styles.photo} contentFit="cover" />
            <View style={styles.flex}>
              <Text style={styles.photoTitle}>{uploading ? t('uploading') : t('passUploaded')}</Text>
              <View style={styles.bar}>
                <Animated.View style={[styles.barFill, barStyle]} />
              </View>
              <Pressable onPress={() => pick('library')} accessibilityRole="button" hitSlop={8}>
                <Text style={styles.replace}>{t('replacePhoto')}</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.drop}>
            <PressableScale onPress={() => pick('camera')} accessibilityRole="button" style={styles.dropButton}>
              <Camera size={22} color={Brand.link} strokeWidth={2.25} />
              <Text style={styles.dropText}>{t('takePhoto')}</Text>
            </PressableScale>
            <PressableScale onPress={() => pick('library')} accessibilityRole="button" style={styles.dropButton}>
              <ImageIcon size={22} color={Brand.link} strokeWidth={2.25} />
              <Text style={styles.dropText}>{t('choosePhoto')}</Text>
            </PressableScale>
          </View>
        )}
      </Animated.View>

      <Pressable onPress={() => router.push('/profile/truck-pass')} accessibilityRole="link" hitSlop={8} style={styles.help}>
        <Text style={styles.helpText}>{t('passHow')}</Text>
      </Pressable>
    </BookingLayout>
  );
}

const useStyles = makeStyles((Brand) => ({
  flex: {
    flex: 1,
  },
  h1: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    color: Brand.text,
  },
  sub: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 21,
    color: Brand.muted,
  },
  card: {
    marginTop: 16,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.text,
  },
  field: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  fieldOk: {
    borderColor: Brand.primary,
    backgroundColor: Brand.selected,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Brand.text,
    outlineWidth: 0,
  },
  drop: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Brand.primary,
    backgroundColor: Brand.selected,
  },
  dropButton: {
    flex: 1,
    height: 84,
    borderRadius: 14,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dropText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.text,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Brand.border,
  },
  photo: {
    width: 88,
    height: 66,
    borderRadius: 12,
    backgroundColor: Brand.surface,
  },
  photoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.text,
  },
  bar: {
    marginTop: 8,
    height: 5,
    borderRadius: 3,
    backgroundColor: Brand.surface,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Brand.primary,
    transformOrigin: 'left',
  },
  replace: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: Brand.link,
  },
  help: {
    marginTop: 18,
    alignSelf: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  helpText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.link,
  },
}));
