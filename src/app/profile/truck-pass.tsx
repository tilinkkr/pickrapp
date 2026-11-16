import { Linking, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ProfilePage } from '@/components/profile/settings';
import { ExternalLink, FileText } from '@/components/ui/icons';
import { PrimaryButton } from '@/components/ui/primary-button';
import { makeStyles, useBrand } from '@/lib/app-theme';
import type { StringKey } from '@/lib/i18n';
import { STAGGER_MS } from '@/lib/motion';
import { useSession } from '@/lib/session';

/** KOMPAS, the Kerala Department of Mining and Geology portal that issues mineral transit passes. */
const PORTAL = 'https://www.portal.dmg.kerala.gov.in/';
const STEPS: StringKey[] = ['passStep1', 'passStep2', 'passStep3', 'passStep4', 'passStep5'];

/** Truck pass: what it is, five numbered steps (step 4 is where it goes in Pickr) and the government portal. */
export default function TruckPassScreen() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();

  return (
    <ProfilePage
      title={t('truckPass')}
      footer={<PrimaryButton label={t('openPortal')} icon={ExternalLink} onPress={() => Linking.openURL(PORTAL).catch(() => {})} />}>
      <Animated.View entering={FadeInDown.duration(260)} style={styles.intro}>
        <View style={styles.introIcon}>
          <FileText size={24} color={Brand.onPrimary} strokeWidth={2.25} />
        </View>
        <Text style={styles.introText}>{t('truckPassIntro')}</Text>
      </Animated.View>

      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <Animated.View key={step} entering={FadeInDown.delay(STAGGER_MS * (1 + i)).springify().damping(18)} style={styles.step}>
            <View style={styles.rail}>
              <View style={[styles.num, i === 3 && styles.numApp]}>
                <Text style={[styles.numText, i === 3 && styles.numTextApp]}>{i + 1}</Text>
              </View>
              {i < STEPS.length - 1 && <View style={styles.line} />}
            </View>
            <Text style={[styles.stepText, i === 3 && styles.stepApp]}>{t(step)}</Text>
          </Animated.View>
        ))}
      </View>

      <View style={styles.portal}>
        <Text style={styles.portalName}>KOMPAS</Text>
        <Text style={styles.portalNote}>{t('portalNote')}</Text>
        <Text style={styles.portalUrl} numberOfLines={1}>
          portal.dmg.kerala.gov.in
        </Text>
      </View>
    </ProfilePage>
  );
}

const useStyles = makeStyles((Brand) => ({
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: Brand.selected,
  },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: Brand.text,
  },
  steps: {
    gap: 0,
  },
  step: {
    flexDirection: 'row',
    gap: 14,
  },
  rail: {
    alignItems: 'center',
    width: 32,
  },
  num: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numApp: {
    backgroundColor: Brand.primary,
  },
  numText: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.text,
  },
  numTextApp: {
    color: Brand.onPrimary,
  },
  line: {
    flex: 1,
    width: 2,
    minHeight: 16,
    backgroundColor: Brand.border,
  },
  stepText: {
    flex: 1,
    paddingTop: 5,
    paddingBottom: 18,
    fontSize: 15,
    lineHeight: 21,
    color: Brand.text,
  },
  stepApp: {
    fontWeight: '700',
  },
  portal: {
    padding: 16,
    gap: 2,
    borderRadius: 20,
    backgroundColor: Brand.surface,
  },
  portalName: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.text,
  },
  portalNote: {
    fontSize: 13,
    color: Brand.muted,
  },
  portalUrl: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: Brand.link,
  },
}));
