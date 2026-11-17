import { type Href, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BookingLayout } from '@/components/booking/booking-layout';
import { ConfirmButton } from '@/components/booking/confirm-button';
import { ForWhomSheet } from '@/components/booking/for-whom';
import { Rain } from '@/components/booking/rain';
import { RouteSummary } from '@/components/booking/route-summary';
import { EmptyState } from '@/components/trips/empty-state';
import {
  Banknote,
  CalendarClock,
  Check,
  Clock,
  CloudRain,
  FileText,
  Lock,
  type LucideIcon,
  NotebookPen,
  Package,
  Pencil,
  Plus,
  Truck,
  User,
  UserRoundCheck,
} from '@/components/ui/icons';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { Image } from 'expo-image';
import { PrimaryButton } from '@/components/ui/primary-button';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { passReady, stepsFor, useBooking, useQuote } from '@/lib/booking';
import { loadsLabel, quantityText } from '@/lib/booking-format';
import { getCategory, pick } from '@/lib/catalog';
import { useDemoRain } from '@/lib/demo-weather';
import { type FareLineKey, splitQuote, waitRate } from '@/lib/fare';
import { selectionHaptic } from '@/lib/haptics';
import { formatIndianMobile } from '@/lib/otp';
import { firstName, meetsText, rememberPerson } from '@/lib/people';
import { asapBlockedUntil, checkSchedule } from '@/lib/schedule';
import { useSession } from '@/lib/session';
import { useSites } from '@/lib/sites';
import { formatRupees, formatWhen, useNow } from '@/lib/trip-format';
import { useTrips } from '@/lib/trips';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const NOTES_MAX = 1000;
/** One-tap notes drivers most often need; tapping again removes it. */
const QUICK_NOTES = ['noteCall', 'noteGate', 'noteSupervisor', 'noteLane'] as const;
const FARE_LABEL: Record<FareLineKey, 'fareBase' | 'fareDistance' | 'fareWaiting' | 'fareRain' | 'farePlatform' | 'fareGst'> = {
  base: 'fareBase',
  distance: 'fareDistance',
  waiting: 'fareWaiting',
  rain: 'fareRain',
  platform: 'farePlatform',
  gst: 'fareGst',
};

/**
 * Step 5 of 5 (handoff C09): the booking in three short rows with edit
 * pencils, optional notes for the driver, and the fare split into its lines
 * (base, distance, platform fee, GST, plus rain when it applies). One
 * confirmation; a time that has gone stale blocks it instead of silently
 * booking "now".
 */
export default function ReviewStep() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t, language, session, signOut } = useSession();
  const { draft, reset, update } = useBooking();
  const { item, chosen } = useQuote();
  const { activeTrip, addTrip } = useTrips();
  const { recordUse } = useSites();
  const raining = useDemoRain();
  const now = new Date(useNow(15_000));
  const created = useRef<{ id: string; scheduled: boolean } | null>(null);
  // The new trip itself counts as active; it must not lock the button it came from.
  const [placing, setPlacing] = useState(false);
  const [priceHeight, setPriceHeight] = useState(0);
  const [whoOpen, setWhoOpen] = useState(false);

  if (!item || !chosen || !draft.pickup || !draft.delivery) {
    return (
      <BookingLayout title={t('review')} step={stepsFor(draft.itemId)}>
        <EmptyState icon={FileText} title={t('notFound')} />
      </BookingLayout>
    );
  }

  const pickup = draft.pickup;
  const delivery = draft.delivery;
  const scheduling = draft.when.mode === 'schedule';
  const check = draft.when.mode === 'schedule' ? checkSchedule(draft.when, now) : null;
  const asapUntil = scheduling ? null : asapBlockedUntil(now);
  const timeProblem = placing
    ? null
    : scheduling && !check?.ok
      ? t('timeExpired')
      : asapUntil
        ? t('asapNowBlocked')
        : item?.transitPass && !passReady(draft)
          ? t('passMissing')
          : null;
  const isGuest = session?.kind === 'guest';
  const blocked = activeTrip !== undefined && !placing;
  const quantity = quantityText(t, item.measure, draft.quantity);
  const fare = splitQuote(chosen.total, raining);
  const payMethod = (session?.kind === 'customer' && session.payMethod) || 'cash';
  const payLabel = t(payMethod === 'gpay' ? 'payGpay' : payMethod === 'whatsapp' ? 'payWhatsapp' : 'payCash');
  // One fixed transport fare (agreed 2026-11-13). Waiting beyond the free time is the only extra, stated beside it.
  const priceText = `₹${formatRupees(fare.total)}`;

  async function confirm() {
    if (!item || !chosen || timeProblem) throw new Error('incomplete');
    setPlacing(true);
    // DEMO: no booking service yet; a short pause stands in for the request.
    await wait(600);
    const trip = addTrip({
      stage: scheduling ? 'scheduled' : 'searching',
      material: pick(item.name, language),
      quantity,
      vehicle: chosen.vehicle.name,
      itemId: item.id,
      vehicleId: chosen.vehicle.id,
      pickup: pickup.label,
      delivery: delivery.label,
      pickupCoords: pickup.coords,
      deliveryCoords: delivery.coords,
      when: check?.ok ? check.date : new Date(),
      quote: fare.total,
      amount: fare.total,
      rain: raining || undefined,
      payPreference: payMethod,
      notes: draft.notes.trim() || undefined,
      transitPass: draft.transitPass.trim() || undefined,
      forOther: draft.forOther ?? undefined,
    });
    recordUse([pickup, delivery]);
    if (draft.forOther) rememberPerson(draft.forOther);
    created.current = { id: trip.id, scheduled: scheduling };
  }

  function done() {
    const trip = created.current;
    reset();
    if (!trip) return;
    // Back from the next screen should land on Home, not inside the finished form.
    router.dismissAll();
    router.push(
      trip.scheduled
        ? { pathname: '/book/submitted', params: { id: trip.id } }
        : { pathname: '/trip/[id]', params: { id: trip.id, placed: '1' } }
    );
  }

  const change = (href: Href) => () => {
    selectionHaptic();
    router.dismissTo(href);
  };

  return (
    <BookingLayout
      title={t('review')}
      step={stepsFor(item.id)}
      summary={`${pick(item.name, language)} · ${priceText}`}
      footer={
        <View style={styles.footer}>
          {(blocked || timeProblem) && !isGuest && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.footerNote}>
              <Lock size={16} color={timeProblem ? Brand.danger : Brand.muted} strokeWidth={2} />
              <Text style={[styles.footerNoteText, timeProblem ? styles.danger : null]}>{timeProblem ?? t('bookingBlocked')}</Text>
            </Animated.View>
          )}
          {isGuest ? (
            <PrimaryButton label={t('signInToContinue')} onPress={signOut} />
          ) : (
            <ConfirmButton
              label={scheduling ? t('scheduleBooking') : t('confirmBooking')}
              busyLabel={t('placingBooking')}
              doneLabel={t('bookingPlaced')}
              price={priceText}
              disabled={blocked || !!timeProblem}
              onConfirm={confirm}
              onDone={done}
            />
          )}
        </View>
      }>
      <RouteSummary pickup={pickup.label} delivery={delivery.label} onEdit={change('/book/route')} />

      <View style={styles.rows}>
        <Row
          image={<ImagePlaceholder source={item.image} tint={item.tint} icon={getCategory(item.category)!.icon} iconSize={18} style={styles.thumb} />}
          title={pick(item.name, language)}
          sub={quantity.split(' · ')[0]}
          onEdit={change('/book/material')}
        />
        <Row
          image={<ImagePlaceholder source={chosen.vehicle.image} tint={['#CBD2DA', '#6B7480']} icon={Truck} iconSize={18} style={styles.thumb} />}
          title={chosen.vehicle.name}
          sub={loadsLabel(t, chosen.loads)}
          onEdit={change('/book/truck')}
        />
        <Row
          icon={scheduling ? CalendarClock : Truck}
          title={scheduling && check?.ok ? formatWhen(language, check.date) : scheduling ? t('pickSlot') : t('asap')}
          warn={!!timeProblem}
          onEdit={change('/book/site')}
        />
        {item.transitPass && (
          <Row
            image={
              draft.transitPassPhoto ? (
                <Image source={{ uri: draft.transitPassPhoto }} style={styles.thumb} contentFit="cover" />
              ) : undefined
            }
            icon={FileText}
            title={draft.transitPass || t('truckPass')}
            sub={passReady(draft) ? t('passUploaded') : t('passMissing')}
            warn={!passReady(draft)}
            onEdit={change('/book/pass')}
          />
        )}
        {/* Who meets the truck: "For me", or the other person with their number, where they meet it and who pays. */}
        <Row
          icon={draft.forOther ? UserRoundCheck : User}
          title={draft.forOther ? t('forName', { name: draft.forOther.name }) : t('forMe')}
          sub={
            // Who pays is stated once, in the fare facts below ("Anu pays the driver").
            draft.forOther ? `${formatIndianMobile(draft.forOther.phone)} · ${meetsText(t, draft.forOther.meets)}` : t('bookingForMeSub')
          }
          subLines={2}
          onEdit={() => {
            selectionHaptic();
            setWhoOpen(true);
          }}
          last
        />
      </View>
      <ForWhomSheet
        visible={whoOpen}
        person={draft.forOther}
        onClose={() => setWhoOpen(false)}
        onDone={(person) => {
          update({ forOther: person });
          setWhoOpen(false);
        }}
      />

      <View style={styles.price} onLayout={(e) => setPriceHeight(e.nativeEvent.layout.height)}>
        {raining && <Rain height={priceHeight} />}
        <View style={styles.priceHead}>
          <Text style={styles.priceLabel}>{t('fixedFare')}</Text>
          {raining && (
            <View style={styles.rainChip}>
              <CloudRain size={14} color="#2563EB" strokeWidth={2.25} />
              <Text style={styles.rainText}>{t('rainingNow')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.priceValue}>{priceText}</Text>
        <View style={styles.lines}>
          {fare.lines.map((line) => (
            <View key={line.key} style={styles.line}>
              <Text style={[styles.lineLabel, line.key === 'rain' && styles.rainLine]}>{t(FARE_LABEL[line.key])}</Text>
              <Text style={[styles.lineValue, line.key === 'rain' && styles.rainLine]}>₹{formatRupees(line.amount)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.facts}>
          <Fact icon={Clock} label={t('waitingRule', { rate: waitRate(chosen.vehicle.name) })} />
          <Fact
            icon={Banknote}
            label={draft.forOther?.pays === 'them' ? t('theyPayDriver', { name: firstName(draft.forOther.name) }) : `${t('payWith')} ${payLabel}`}
          />
          <Fact icon={Package} label={t('noMaterialChip')} />
        </View>
      </View>

      <Text style={styles.section}>{t('noteForDriver')}</Text>
      <View style={styles.field}>
        <NotebookPen size={20} color={Brand.muted} strokeWidth={2} />
        <TextInput
          value={draft.notes}
          onChangeText={(notes) => update({ notes })}
          placeholder={t('notesPlaceholder')}
          placeholderTextColor="#A8A29E"
          multiline
          maxLength={NOTES_MAX}
          accessibilityLabel={t('notesLabel')}
          style={styles.input}
        />
      </View>
      <View style={styles.quick}>
        {QUICK_NOTES.map((key) => {
          const text = t(key);
          const used = draft.notes.includes(text);
          return (
            <Pressable
              key={key}
              onPress={() => {
                selectionHaptic();
                update({
                  notes: used
                    ? draft.notes.replace(text, '').replace(/^[\s.,]+|[\s.,]+$/g, '').replace(/\.\s*\./g, '.')
                    : [draft.notes.trim(), text].filter(Boolean).join('. '),
                });
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: used }}
              style={[styles.quickChip, used && styles.quickChipOn]}>
              {used ? <Check size={14} color={Brand.link} strokeWidth={3} /> : <Plus size={14} color={Brand.muted} strokeWidth={2.5} />}
              <Text style={[styles.quickText, used && styles.quickTextOn]}>{text}</Text>
            </Pressable>
          );
        })}
      </View>

    </BookingLayout>
  );
}

function Row({
  image,
  icon: Icon,
  title,
  sub,
  subLines = 1,
  warn,
  onEdit,
  last,
}: {
  image?: React.ReactNode;
  icon?: LucideIcon;
  title: string;
  sub?: string;
  subLines?: number;
  warn?: boolean;
  onEdit: () => void;
  last?: boolean;
}) {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      {image ?? (
        <View style={[styles.iconBox, warn && styles.iconBoxWarn]}>
          {Icon && <Icon size={20} color={warn ? Brand.danger : Brand.link} strokeWidth={2} />}
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, warn && styles.danger]} numberOfLines={1}>
          {title}
        </Text>
        {sub && (
          <Text style={styles.rowSub} numberOfLines={subLines}>
            {sub}
          </Text>
        )}
      </View>
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`${t('change')} ${title}`} hitSlop={8} style={styles.edit}>
        <Pencil size={17} color={Brand.text} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

function Fact({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const Brand = useBrand();
  const styles = useStyles();
  return (
    <View style={styles.fact}>
      <Icon size={14} color={Brand.link} strokeWidth={2.25} />
      <Text style={styles.factText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  rows: {
    marginTop: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  thumb: {
    width: 48,
    height: 40,
    borderRadius: 10,
  },
  iconBox: {
    width: 48,
    height: 40,
    borderRadius: 10,
    backgroundColor: Brand.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxWarn: {
    backgroundColor: Brand.dangerFill,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.text,
  },
  rowSub: {
    fontSize: 13,
    color: Brand.muted,
  },
  edit: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  price: {
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: Brand.surface,
    overflow: 'hidden',
  },
  priceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Brand.muted,
  },
  rainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
  },
  rainText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  priceValue: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  lines: {
    marginTop: 12,
    paddingTop: 12,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lineLabel: {
    fontSize: 14,
    color: Brand.muted,
  },
  lineValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  rainLine: {
    color: '#1E40AF',
  },
  facts: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Brand.card,
  },
  factText: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.text,
  },
  section: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 17,
    fontWeight: '800',
    color: Brand.text,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 16,
    borderRadius: 16,
    backgroundColor: Brand.surface,
  },
  input: {
    flex: 1,
    minHeight: 40,
    paddingBottom: 14,
    fontSize: 16,
    color: Brand.text,
    textAlignVertical: 'top',
    outlineWidth: 0,
  },
  quick: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Brand.border,
  },
  quickChipOn: {
    borderColor: Brand.primary,
    backgroundColor: Brand.selected,
  },
  quickText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.text,
  },
  quickTextOn: {
    color: Brand.link,
  },
  footer: {
    gap: 10,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Brand.muted,
  },
  danger: {
    color: Brand.danger,
  },
}));
