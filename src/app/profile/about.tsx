import Constants from 'expo-constants';
import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { PickrTruck } from '@/components/brand/pickr-truck';
import { ProfilePage, SettingsGroup, SettingsRow } from '@/components/profile/settings';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Apple, FileText, Play, ScrollText, Shield, ThumbsUp } from '@/components/ui/icons';
import { makeStyles, useBrand } from '@/lib/app-theme';
import type { StringKey } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { enterAt } from '@/lib/motion';

type Legal = { title: StringKey; body: StringKey };
const LEGAL: Legal[] = [
  { title: 'termsOfUse', body: 'termsBody' },
  { title: 'privacyPolicy', body: 'privacyBody' },
  { title: 'licences', body: 'licencesBody' },
];

/**
 * About: logo, a two-line description, store and Facebook links (shown as
 * "Soon": the app is not published yet, handoff section 11), legal pages in
 * order, and the version.
 */
export default function AboutScreen() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  const [open, setOpen] = useState<Legal | null>(null);
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const soon = <Text style={styles.soon}>{t('soon')}</Text>;

  return (
    <ProfilePage title={t('about')}>
      <Animated.View entering={enterAt()} style={styles.logo}>
        <PickrTruck width={140} color={Brand.primary} withSpeedLines />
        <Text style={styles.word}>PICKR</Text>
        <Text style={styles.tag}>HEAVY LOGISTICS</Text>
      </Animated.View>
      <Text style={styles.body}>{t('aboutBody')}</Text>

      <SettingsGroup title={t('rateUs')}>
        <SettingsRow icon={Play} label={t('playStore')} trailing={soon} />
        <SettingsRow icon={Apple} label={t('appStore')} trailing={soon} />
        <SettingsRow icon={ThumbsUp} label={t('likeFacebook')} trailing={soon} last />
      </SettingsGroup>

      <SettingsGroup title={t('legal')}>
        {LEGAL.map((item, i) => (
          <SettingsRow
            key={item.title}
            icon={i === 0 ? ScrollText : i === 1 ? Shield : FileText}
            label={`${i + 1}. ${t(item.title)}`}
            onPress={() => setOpen(item)}
            last={i === LEGAL.length - 1}
          />
        ))}
      </SettingsGroup>

      <View style={styles.version}>
        <Text style={styles.versionText}>{t('versionLabel', { v: version })}</Text>
      </View>

      <BottomSheet visible={open !== null} title={open ? t(open.title) : ''} closeLabel={t('close')} onClose={() => setOpen(null)}>
        <Text style={styles.sheetText}>{open ? t(open.body) : ''}</Text>
      </BottomSheet>
    </ProfilePage>
  );
}

const useStyles = makeStyles((Brand) => ({
  logo: {
    paddingVertical: 20,
    borderRadius: 24,
    backgroundColor: Brand.selected,
    alignItems: 'center',
    gap: 2,
  },
  word: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
    color: Brand.text,
  },
  tag: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    color: Brand.link,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: Brand.text,
  },
  soon: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Brand.selected,
    fontSize: 12,
    fontWeight: '800',
    color: Brand.link,
  },
  version: {
    alignItems: 'center',
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.muted,
  },
  sheetText: {
    fontSize: 16,
    lineHeight: 23,
    color: Brand.text,
  },
}));
