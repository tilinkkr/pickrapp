import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ProfilePage } from '@/components/profile/settings';
import { Check, type LucideIcon, Moon, Sun, SunMoon } from '@/components/ui/icons';
import { DarkBrand, makeStyles, type ThemePreference, useAppTheme, useBrand } from '@/lib/app-theme';
import { Brand as LightBrand, type Palette } from '@/constants/theme';
import { selectionHaptic } from '@/lib/haptics';
import type { StringKey } from '@/lib/i18n';
import { STAGGER_MS } from '@/lib/motion';
import { useSession } from '@/lib/session';

const OPTIONS: { value: ThemePreference; icon: LucideIcon; label: StringKey }[] = [
  { value: 'system', icon: SunMoon, label: 'themeSystem' },
  { value: 'light', icon: Sun, label: 'themeLight' },
  { value: 'dark', icon: Moon, label: 'themeDark' },
];

/** Theme: Auto, Light or Dark as three cards, each with a tiny preview of the app in that palette. */
export default function ThemeScreen() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  const { preference, setPreference, dark } = useAppTheme();

  return (
    <ProfilePage title={t('theme')}>
      <View style={styles.row} accessibilityRole="radiogroup">
        {OPTIONS.map((o, i) => {
          const selected = o.value === preference;
          const palette = o.value === 'dark' || (o.value === 'system' && dark) ? DarkBrand : LightBrand;
          return (
            <Animated.View key={o.value} entering={FadeInDown.delay(i * STAGGER_MS).springify().damping(18)} style={styles.cell}>
              <Pressable
                onPress={() => {
                  if (selected) return;
                  selectionHaptic();
                  setPreference(o.value);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={t(o.label)}
                style={[styles.card, selected && styles.cardOn]}>
                <Preview palette={palette} />
                <View style={styles.labelRow}>
                  <o.icon size={16} color={Brand.text} strokeWidth={2.25} />
                  <Text style={styles.label}>{t(o.label)}</Text>
                </View>
                <View style={[styles.radio, selected && styles.radioOn]}>{selected && <Check size={12} color={Brand.onPrimary} strokeWidth={3} />}</View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
      <Text style={styles.note}>{t('themeSystemNote')}</Text>
    </ProfilePage>
  );
}

/** A miniature screen: header bar, a card and an orange button. */
function Preview({ palette }: { palette: Palette }) {
  const styles = useStyles();
  return (
    <View style={[styles.preview, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={[styles.pBar, { backgroundColor: palette.surface }]} />
      <View style={[styles.pCard, { backgroundColor: palette.surface }]} />
      <View style={[styles.pLine, { backgroundColor: palette.border }]} />
      <View style={[styles.pButton, { backgroundColor: palette.primary }]} />
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  cell: {
    flex: 1,
  },
  card: {
    padding: 10,
    gap: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: Brand.surface,
    alignItems: 'center',
  },
  cardOn: {
    borderColor: Brand.primary,
    backgroundColor: Brand.selected,
  },
  preview: {
    width: '100%',
    aspectRatio: 0.62,
    padding: 8,
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  pBar: {
    height: 10,
    borderRadius: 4,
  },
  pCard: {
    height: 34,
    borderRadius: 6,
  },
  pLine: {
    height: 6,
    width: '70%',
    borderRadius: 3,
  },
  pButton: {
    marginTop: 'auto',
    height: 14,
    borderRadius: 5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.text,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: Brand.primary,
    backgroundColor: Brand.primary,
  },
  note: {
    fontSize: 13,
    color: Brand.muted,
    textAlign: 'center',
  },
}));
