import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { RouteSummary } from '@/components/booking/route-summary';
import { ProfilePage } from '@/components/profile/settings';
import { tripAmount } from '@/components/trips/trip-card';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Banknote, CircleX, Clock, FileText, type LucideIcon, Search, ShieldCheck, Ticket, Truck } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/pressable-scale';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { shortVehicleName } from '@/lib/booking-format';
import { selectionHaptic } from '@/lib/haptics';
import type { StringKey } from '@/lib/i18n';
import { enterAt, STAGGER_MS } from '@/lib/motion';
import { useSession } from '@/lib/session';
import { formatWhen, stageColors } from '@/lib/trip-format';
import { isPast, useTrips } from '@/lib/trips';

/** Get help is blue on purpose (requested 2026-11-10): it is the one non-orange action, so it stands out as "support". */
const HELP_BLUE = '#2563EB';

type Faq = { icon: LucideIcon; title: StringKey; short: StringKey; body: StringKey };
const FAQS: Faq[] = [
  { icon: Truck, title: 'faqBookTitle', short: 'faqBookShort', body: 'faqBookBody' },
  { icon: Banknote, title: 'faqPayTitle', short: 'faqPayShort', body: 'faqPayBody' },
  { icon: Clock, title: 'faqWaitTitle', short: 'faqWaitShort', body: 'faqWaitBody' },
  { icon: CircleX, title: 'faqCancelTitle', short: 'faqCancelShort', body: 'faqCancelBody' },
  { icon: FileText, title: 'truckPass', short: 'truckPassIntro', body: 'passStep1' },
  { icon: ShieldCheck, title: 'faqSafetyTitle', short: 'faqSafetyShort', body: 'faqSafetyBody' },
];

/**
 * Help: search first, then the last ride (one card, the usual reason people
 * come here), the blue Get help action and tickets, then FAQs as an icon
 * grid; a tile opens the full answer.
 */
export default function HelpScreen() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t, language } = useSession();
  const { trips } = useTrips();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Faq | 'help' | 'tickets' | null>(null);
  const last = trips.find(isPast) ?? trips[0];
  const q = query.trim().toLowerCase();
  const faqs = q ? FAQS.filter((f) => `${t(f.title)} ${t(f.short)} ${t(f.body)}`.toLowerCase().includes(q)) : FAQS;

  return (
    <ProfilePage title={t('help')}>
      <View style={styles.search}>
        <Search size={20} color={Brand.muted} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('helpSearch')}
          placeholderTextColor="#A8A29E"
          accessibilityLabel={t('helpSearch')}
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>

      {last && !q && (
        <Animated.View entering={enterAt()}>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>{t('yourLastRide')}</Text>
            <Pressable onPress={() => router.push('/profile/rides')} accessibilityRole="button" hitSlop={8} style={styles.viewAll}>
              <Text style={styles.viewAllText}>{t('viewAllRides')}</Text>
            </Pressable>
          </View>
          <PressableScale
            onPress={() => router.push(isPast(last) ? { pathname: '/loads/[id]', params: { id: last.id } } : { pathname: '/trip/[id]', params: { id: last.id } })}
            accessibilityRole="button"
            style={styles.ride}>
            <View style={styles.rideTop}>
              <View style={styles.flex}>
                <Text style={styles.rideTruck} numberOfLines={1}>
                  {shortVehicleName(last.vehicle)}
                </Text>
                <Text style={styles.rideWhen}>{formatWhen(language, last.when)}</Text>
              </View>
              {tripAmount(last) && <Text style={styles.rideAmount}>{tripAmount(last)}</Text>}
            </View>
            <View style={[styles.chip, { backgroundColor: stageColors(last.stage, Brand).bg }]}>
              <Text style={[styles.chipText, { color: stageColors(last.stage, Brand).fg }]}>{t(`short_${last.stage}` as 'short_completed')}</Text>
            </View>
            <RouteSummary pickup={last.pickup} delivery={last.delivery} />
          </PressableScale>
        </Animated.View>
      )}

      {!q && (
        <Animated.View entering={enterAt(0, STAGGER_MS)} style={styles.issue}>
          <Text style={styles.issueTitle}>{t('havingIssue')}</Text>
          <PressableScale
            onPress={() => {
              selectionHaptic();
              setOpen('help');
            }}
            accessibilityRole="button"
            style={styles.helpButton}>
            <Text style={styles.helpButtonText}>{t('getHelp')}</Text>
          </PressableScale>
          <Pressable onPress={() => setOpen('tickets')} accessibilityRole="button" hitSlop={8} style={styles.tickets}>
            <Ticket size={16} color={Brand.link} strokeWidth={2.25} />
            <Text style={styles.viewAllText}>{t('viewAllTickets')}</Text>
          </Pressable>
        </Animated.View>
      )}

      <View>
        <Text style={[styles.section, styles.faqHead]}>{t('faqs')}</Text>
        <Animated.View layout={LinearTransition} style={styles.grid}>
          {faqs.map((faq, i) => (
            <Animated.View key={faq.title} entering={enterAt(0, STAGGER_MS * (2 + i))} style={styles.cell}>
              <PressableScale
                onPress={() => {
                  selectionHaptic();
                  setOpen(faq);
                }}
                accessibilityRole="button"
                style={styles.faq}>
                <View style={styles.faqIcon}>
                  <faq.icon size={20} color={Brand.link} strokeWidth={2.25} />
                </View>
                <Text style={styles.faqTitle} numberOfLines={1}>
                  {t(faq.title)}
                </Text>
                <Text style={styles.faqShort} numberOfLines={2}>
                  {t(faq.short)}
                </Text>
              </PressableScale>
            </Animated.View>
          ))}
        </Animated.View>
      </View>

      <BottomSheet
        visible={open !== null}
        title={open === 'help' ? t('getHelp') : open === 'tickets' ? t('viewAllTickets') : open ? t(open.title) : ''}
        closeLabel={t('close')}
        onClose={() => setOpen(null)}>
        <Text style={styles.sheetText}>
          {open === 'help' ? t('helpBody') : open === 'tickets' ? t('noTickets') : open ? t(open.body) : ''}
        </Text>
      </BottomSheet>
    </ProfilePage>
  );
}

const useStyles = makeStyles((Brand) => ({
  flex: {
    flex: 1,
  },
  search: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Brand.surface,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: Brand.text,
    outlineWidth: 0,
  },
  sectionRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  section: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: Brand.text,
  },
  faqHead: {
    marginBottom: 12,
  },
  viewAll: {
    minHeight: 40,
    justifyContent: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '800',
    color: Brand.link,
  },
  ride: {
    padding: 16,
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
  },
  rideTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rideTruck: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.text,
  },
  rideWhen: {
    marginTop: 2,
    fontSize: 13,
    color: Brand.muted,
  },
  rideAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  issue: {
    padding: 16,
    gap: 12,
    borderRadius: 20,
    backgroundColor: Brand.surface,
  },
  issueTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Brand.text,
  },
  helpButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: HELP_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tickets: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: {
    flexBasis: '40%',
    flexGrow: 1,
  },
  faq: {
    height: 132,
    padding: 14,
    gap: 6,
    borderRadius: 20,
    backgroundColor: Brand.surface,
  },
  faqIcon: {
    width: 40,
    height: 40,
    marginBottom: 2,
    borderRadius: 13,
    backgroundColor: Brand.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.text,
  },
  faqShort: {
    fontSize: 12,
    lineHeight: 16,
    color: Brand.muted,
  },
  sheetText: {
    fontSize: 16,
    lineHeight: 23,
    color: Brand.text,
  },
}));
