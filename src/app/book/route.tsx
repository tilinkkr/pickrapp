import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, TextInput, type TextInputInstance, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { BookingLayout } from '@/components/booking/booking-layout';
import { History, LocateFixed, MapIcon, Pin, TriangleAlert, X } from '@/components/ui/icons';
import { Brand } from '@/constants/theme';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { type Site, useBooking } from '@/lib/booking';
import { choiceHaptic, errorHaptic, selectionHaptic, successHaptic, tapHaptic } from '@/lib/haptics';
import { locateSite } from '@/lib/locate';
import { useSession } from '@/lib/session';
import { asSite, useSites } from '@/lib/sites';

type Field = 'pickup' | 'delivery';
/** Long enough to see the site land in the card before the next step slides in. */
const ADVANCE_MS = 450;
type Failure = { kind: 'denied'; canAskAgain: boolean } | { kind: 'failed' } | null;

const PICKUP_DOT = Brand.success;
const DELIVERY_DOT = Brand.primary;

/**
 * Step 2 of 5 (handoff C04 + C06): both sites in one card, like a ride app.
 * The active field takes typing, GPS, a map pin or a favourite (most-booked)
 * site; filling pickup moves on to delivery.
 */
export default function RouteStep() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  const { draft, update } = useBooking();
  const { favourites, togglePin } = useSites();
  const [active, setActive] = useState<Field>(draft.pickup ? 'delivery' : 'pickup');
  const [locating, setLocating] = useState(false);
  const [failure, setFailure] = useState<Failure>(null);
  const deliveryInput = useRef<TextInputInstance>(null);

  const set = (field: Field, site: Site | null) => update(field === 'pickup' ? { pickup: site } : { delivery: site });
  const other = active === 'pickup' ? draft.delivery : draft.pickup;
  const ready = !!draft.pickup && !!draft.delivery;
  const leaving = useRef(false);
  const seen = useRef({ pickup: draft.pickup?.label, delivery: draft.delivery?.label });

  /** No Continue button: once both sites are set the next step slides in by itself. */
  function advance() {
    if (leaving.current) return;
    leaving.current = true;
    successHaptic();
    setTimeout(() => {
      leaving.current = false;
      router.push('/book/site');
    }, ADVANCE_MS);
  }

  function fill(site: Site) {
    set(active, site);
    const pickup = active === 'pickup' ? site : draft.pickup;
    const delivery = active === 'delivery' ? site : draft.delivery;
    if (pickup && delivery) advance();
    else if (active === 'pickup') {
      setActive('delivery');
      deliveryInput.current?.focus();
    }
  }

  // A site pinned on the map arrives after the map screen closes; move on if that completed the route.
  useEffect(() => {
    const previous = seen.current;
    seen.current = { pickup: draft.pickup?.label, delivery: draft.delivery?.label };
    const fromMap =
      (draft.pickup?.source === 'map' && draft.pickup.label !== previous.pickup) ||
      (draft.delivery?.source === 'map' && draft.delivery.label !== previous.delivery);
    if (fromMap && draft.pickup && draft.delivery) advance();
  }, [draft.pickup, draft.delivery]);

  async function useCurrent() {
    choiceHaptic();
    setLocating(true);
    setFailure(null);
    const result = await locateSite(t('pinnedLocation'));
    setLocating(false);
    if (result.ok) {
      successHaptic();
      fill(result.site);
    } else {
      errorHaptic();
      setFailure(result.reason === 'denied' ? { kind: 'denied', canAskAgain: result.canAskAgain } : { kind: 'failed' });
    }
  }

  return (
    <BookingLayout title={t('routeTitle')} step={2}>
      <View style={styles.card}>
        <FieldRow
          field="pickup"
          active={active === 'pickup'}
          site={draft.pickup}
          placeholder={t('pickupLocation')}
          onFocus={() => setActive('pickup')}
          onChange={(site) => set('pickup', site)}
          autoFocus={!draft.pickup}
          returnKeyType="next"
          onSubmit={() => {
            setActive('delivery');
            deliveryInput.current?.focus();
          }}
        />
        <View style={styles.connector} aria-hidden>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.connectorDot} />
          ))}
        </View>
        <View style={styles.divider} />
        <FieldRow
          ref={deliveryInput}
          field="delivery"
          active={active === 'delivery'}
          site={draft.delivery}
          placeholder={t('deliveryLocation')}
          onFocus={() => setActive('delivery')}
          onChange={(site) => set('delivery', site)}
          autoFocus={!!draft.pickup && !draft.delivery}
          returnKeyType="go"
          onSubmit={() => ready && advance()}
        />
      </View>

      <View style={styles.pills}>
        <Pill
          icon={MapIcon}
          label={t('selectOnMap')}
          onPress={() => {
            tapHaptic();
            router.push({ pathname: '/book/map', params: { purpose: active } });
          }}
        />
        <Pill icon={LocateFixed} label={locating ? t('locating') : t('currentPlace')} busy={locating} onPress={useCurrent} />
      </View>

      {failure && (
        <Animated.View entering={FadeIn.duration(180)} style={styles.failure} accessibilityRole="alert">
          <TriangleAlert size={18} color={Brand.warning} strokeWidth={2} />
          <View style={styles.flex}>
            <Text style={styles.failureText}>
              {failure.kind === 'denied' ? t('locationDeniedForm') : t('locationFailedForm')}
            </Text>
            {failure.kind === 'denied' && !failure.canAskAgain && (
              <Pressable onPress={() => Linking.openSettings().catch(() => {})} accessibilityRole="link" hitSlop={8}>
                <Text style={styles.link}>{t('openSettings')}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}

      {favourites.length > 0 && (
        <View style={styles.list}>
          {favourites.slice(0, 6).map((site, i) => {
            const taken = other?.label === site.label;
            const [name, ...rest] = site.label.split(',');
            return (
              <Animated.View
                key={site.id}
                entering={FadeInDown.delay(i * 40).duration(260)}
                style={[styles.row, i > 0 && styles.rowBorder, taken && styles.rowTaken]}>
                <Pressable
                  onPress={() => {
                    choiceHaptic();
                    fill(asSite(site));
                  }}
                  disabled={taken}
                  accessibilityRole="button"
                  accessibilityLabel={`${site.label}, ${site.uses === 1 ? t('bookedOnce') : t('bookedTimes', { n: site.uses })}`}
                  style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}>
                  <View style={styles.rowIcon}>
                    <History size={18} color={Brand.muted} strokeWidth={2} />
                    <Text style={styles.rowCount}>{site.uses}×</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={styles.rowAddress} numberOfLines={1}>
                      {rest.join(',').trim() || site.label}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => {
                    selectionHaptic();
                    togglePin(site.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={site.pinned ? t('unpinSite') : t('pinSite')}
                  hitSlop={8}
                  style={styles.pin}>
                  <Pin
                    size={20}
                    color={site.pinned ? Brand.link : '#A8A29E'}
                    strokeWidth={site.pinned ? 2.25 : 1.5}
                    fill={site.pinned ? Brand.primary : 'none'}
                    fillOpacity={site.pinned ? 0.35 : 0}
                  />
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}
    </BookingLayout>
  );
}

type FieldRowProps = {
  ref?: React.Ref<TextInputInstance>;
  field: Field;
  active: boolean;
  site: Site | null | undefined;
  placeholder: string;
  autoFocus?: boolean;
  onFocus: () => void;
  onChange: (site: Site | null) => void;
  returnKeyType: 'next' | 'go';
  onSubmit: () => void;
};

function FieldRow({ ref, field, active, site, placeholder, autoFocus, onFocus, onChange, returnKeyType, onSubmit }: FieldRowProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  return (
    <View style={styles.field}>
      <View style={[styles.dot, { borderColor: field === 'pickup' ? PICKUP_DOT : DELIVERY_DOT }]}>
        <View style={[styles.dotCore, { backgroundColor: field === 'pickup' ? PICKUP_DOT : DELIVERY_DOT }]} />
      </View>
      <TextInput
        ref={ref}
        value={site?.label ?? ''}
        onChangeText={(text) => onChange(text.trim() ? { label: text, source: 'manual' } : null)}
        onFocus={onFocus}
        autoFocus={autoFocus}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmit}
        submitBehavior="submit"
        placeholder={placeholder}
        placeholderTextColor="#A8A29E"
        maxLength={300}
        textContentType="fullStreetAddress"
        autoComplete="street-address"
        accessibilityLabel={placeholder}
        style={[styles.input, active && styles.inputActive]}
      />
      {site && (
        <Pressable onPress={() => onChange(null)} accessibilityRole="button" accessibilityLabel={t('clear')} hitSlop={8}>
          <X size={18} color={Brand.muted} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}

function Pill({ icon: Icon, label, busy, onPress }: { icon: typeof MapIcon; label: string; busy?: boolean; onPress: () => void }) {
  const Brand = useBrand();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy }}
      style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}>
      {busy ? <ActivityIndicator size="small" color={Brand.text} /> : <Icon size={18} color={Brand.text} strokeWidth={2} />}
      <Text style={styles.pillText} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((Brand) => ({
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  card: {
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
  },
  field: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connector: {
    position: 'absolute',
    left: 14 + 9,
    top: 40,
    gap: 3,
  },
  connectorDot: {
    width: 2,
    height: 4,
    borderRadius: 1,
    backgroundColor: '#A8A29E',
  },
  divider: {
    marginLeft: 34,
    height: 1,
    backgroundColor: Brand.border,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: Brand.text,
    outlineWidth: 0,
  },
  inputActive: {
    fontWeight: '600',
  },
  pills: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  pillPressed: {
    backgroundColor: Brand.surface,
  },
  pillText: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Brand.text,
  },
  failure: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Brand.warningFill,
  },
  failureText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#9A3412',
  },
  link: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: Brand.link,
  },
  list: {
    marginTop: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: Brand.border,
    borderStyle: 'dashed',
  },
  rowTaken: {
    opacity: 0.4,
  },
  rowMain: {
    flex: 1,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 36,
    alignItems: 'center',
    gap: 2,
  },
  rowCount: {
    fontSize: 11,
    fontWeight: '600',
    color: Brand.muted,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.text,
  },
  rowAddress: {
    fontSize: 14,
    color: Brand.muted,
  },
  pin: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
