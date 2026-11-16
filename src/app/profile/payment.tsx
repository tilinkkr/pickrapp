import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ProfilePage } from '@/components/profile/settings';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Banknote, Check, CircleHelp, CircleX, Clock, type LucideIcon, MessageCircle, Smartphone, Wallet } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/pressable-scale';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { choiceHaptic, selectionHaptic } from '@/lib/haptics';
import type { StringKey } from '@/lib/i18n';
import { STAGGER_MS } from '@/lib/motion';
import { type PayMethod, useSession } from '@/lib/session';

const METHODS: { value: PayMethod; icon: LucideIcon; label: StringKey; note: StringKey }[] = [
  { value: 'gpay', icon: Smartphone, label: 'payGpay', note: 'payUpiNote' },
  { value: 'whatsapp', icon: MessageCircle, label: 'payWhatsapp', note: 'payUpiNote' },
  { value: 'cash', icon: Banknote, label: 'payCash', note: 'payCashNote' },
];

const FAQS: { icon: LucideIcon; title: StringKey; body: StringKey }[] = [
  { icon: Banknote, title: 'faqPayTitle', body: 'faqPayBody' },
  { icon: Clock, title: 'faqWaitTitle', body: 'faqWaitBody' },
  { icon: CircleX, title: 'faqCancelTitle', body: 'faqCancelBody' },
];

/**
 * Payments: the Pickr wallet (demo; top-ups start after the pilot, handoff
 * section 11), then how the customer pays the driver. The preferred method is
 * shown on the booking review; nothing is charged in the app.
 */
export default function PaymentScreen() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t, session, updateProfile } = useSession();
  const [sheet, setSheet] = useState<'wallet' | number | null>(null);
  const preferred = (session?.kind === 'customer' && session.payMethod) || 'cash';

  return (
    <ProfilePage title={t('payments')} action={{ icon: CircleHelp, label: t('help'), onPress: () => router.push('/profile/help') }}>
      <Animated.View entering={FadeInDown.duration(260)}>
        <PressableScale
          onPress={() => {
            choiceHaptic();
            setSheet('wallet');
          }}
          accessibilityRole="button"
          style={styles.wallet}>
          <View style={styles.walletTop}>
            <Wallet size={22} color={Brand.onPrimary} strokeWidth={2.25} />
            <Text style={styles.walletName}>{t('pickrWallet')}</Text>
          </View>
          <Text style={styles.walletAmount}>₹0</Text>
          <View style={styles.walletBottom}>
            <Text style={styles.walletNote}>{t('walletDemo')}</Text>
            <View style={styles.recharge}>
              <Text style={styles.rechargeText}>{t('recharge')}</Text>
            </View>
          </View>
        </PressableScale>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(STAGGER_MS).duration(260)}>
        <Text style={styles.section}>{t('payWith')}</Text>
        <View style={styles.group} accessibilityRole="radiogroup">
          {METHODS.map((m, i) => {
            const selected = m.value === preferred;
            return (
              <Pressable
                key={m.value}
                onPress={() => {
                  if (selected) return;
                  selectionHaptic();
                  updateProfile({ payMethod: m.value });
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.method, i < METHODS.length - 1 && styles.divider, pressed && styles.pressed]}>
                <View style={[styles.methodIcon, selected && styles.methodIconOn]}>
                  <m.icon size={20} color={selected ? Brand.onPrimary : Brand.link} strokeWidth={2.25} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.methodLabel}>{t(m.label)}</Text>
                  <Text style={styles.methodNote}>{selected ? t('payPreferred') : t(m.note)}</Text>
                </View>
                <View style={[styles.radio, selected && styles.radioOn]}>{selected && <Check size={14} color={Brand.onPrimary} strokeWidth={3} />}</View>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(STAGGER_MS * 2).duration(260)}>
        <Text style={styles.section}>{t('faqs')}</Text>
        <View style={styles.faqs}>
          {FAQS.map((f, i) => (
            <PressableScale
              key={f.title}
              onPress={() => {
                selectionHaptic();
                setSheet(i);
              }}
              accessibilityRole="button"
              style={styles.faq}>
              <f.icon size={20} color={Brand.link} strokeWidth={2.25} />
              <Text style={styles.faqTitle} numberOfLines={2}>
                {t(f.title)}
              </Text>
            </PressableScale>
          ))}
        </View>
      </Animated.View>

      <BottomSheet
        visible={sheet !== null}
        title={sheet === 'wallet' ? t('pickrWallet') : sheet !== null ? t(FAQS[sheet].title) : ''}
        closeLabel={t('close')}
        onClose={() => setSheet(null)}>
        <Text style={styles.sheetText}>{sheet === 'wallet' ? t('walletSoon') : sheet !== null ? t(FAQS[sheet].body) : ''}</Text>
      </BottomSheet>
    </ProfilePage>
  );
}

const useStyles = makeStyles((Brand) => ({
  flex: {
    flex: 1,
  },
  pressed: {
    backgroundColor: Brand.border,
  },
  wallet: {
    padding: 20,
    gap: 6,
    borderRadius: 24,
    backgroundColor: Brand.primary,
  },
  walletTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.onPrimary,
  },
  walletAmount: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    color: Brand.onPrimary,
    fontVariant: ['tabular-nums'],
  },
  walletBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletNote: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.onPrimary,
    opacity: 0.75,
  },
  recharge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  rechargeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C2410C',
  },
  section: {
    marginBottom: 12,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: Brand.text,
  },
  group: {
    borderRadius: 20,
    backgroundColor: Brand.surface,
    overflow: 'hidden',
  },
  method: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: Brand.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconOn: {
    backgroundColor: Brand.primary,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.text,
  },
  methodNote: {
    marginTop: 1,
    fontSize: 13,
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
    backgroundColor: Brand.primary,
  },
  faqs: {
    flexDirection: 'row',
    gap: 10,
  },
  faq: {
    flex: 1,
    height: 96,
    padding: 12,
    gap: 8,
    borderRadius: 18,
    backgroundColor: Brand.surface,
  },
  faqTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    color: Brand.text,
  },
  sheetText: {
    fontSize: 16,
    lineHeight: 23,
    color: Brand.text,
  },
}));
