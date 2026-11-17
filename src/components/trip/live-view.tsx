import { Linking, Platform, Pressable, Share, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LoadPhotos } from '@/components/trip/load-photos';
import { SiteTimer } from '@/components/trip/site-timer';
import { ActionCell, cardDelay, GlassCard, GlassCell, GlassRow, InfoRow } from '@/components/ui/glass';
import { ChevronRight } from '@/components/ui/icons';
import { MIcon } from '@/components/ui/m-icon';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { shortVehicleName } from '@/lib/booking-format';
import { freeSecondsLeft, tripFare, waitRate } from '@/lib/fare';
import { choiceHaptic } from '@/lib/haptics';
import { enterAt } from '@/lib/motion';
import { firstName, meetsText, personLine, shareTripText } from '@/lib/people';
import { useSession } from '@/lib/session';
import { cancelFee } from '@/lib/trip-machine';
import { formatAgo, formatRupees, STALE_LOCATION_MS } from '@/lib/trip-format';
import type { Trip } from '@/lib/trips';

/** Anything on the page that is not a grid arrives on the same beat as the grids around it. */
const rise = (index: number) => enterAt(0, cardDelay(index));
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
/** Demo route length, for the delivery-leg progress bar. */
const DEMO_ROUTE_KM = 6.2;

type LivePageProps = { trip: Trip; now: number; onDetails: () => void; onCancel: () => void };

/**
 * Driver found → unloading (C14–C17), one page per stage on a plain white
 * sheet. Every page is the same kind of thing: a centred headline, then
 * outlined grids in order of importance, each split by lines that meet the
 * card edge. Orange marks the one grid that matters most on the page. Each
 * grid arrives in page order and draws its rows and lines in as it does
 * (see GlassCard); live numbers inside never replay it.
 */
export function LivePage(props: LivePageProps) {
  switch (props.trip.stage) {
    case 'to_pickup':
      return <PickupPage {...props} />;
    case 'in_transit':
      return <DeliveringPage {...props} />;
    case 'loading':
    case 'unloading':
      return <SitePage {...props} />;
    default:
      return null;
  }
}

/** Driver on the way to pickup (C14): when, the PIN, who and which truck, where to meet, then the actions. */
function PickupPage({ trip, onDetails, onCancel }: LivePageProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  const fee = cancelFee(trip);
  const driver = trip.driver;
  const stats = driver?.stats;
  const other = trip.forOther;

  return (
    <View style={styles.page}>
      <Animated.View entering={rise(0)} accessibilityLiveRegion="polite">
        <Text style={styles.headline} accessibilityRole="header">
          {trip.etaMinutes != null ? t('pickupIn', { n: trip.etaMinutes }) : t('stage_to_pickup')}
        </Text>
      </Animated.View>

      {trip.pin && (
        <Animated.View entering={rise(1)} style={styles.pinBar} accessible accessibilityLabel={`${t('startPin')} ${trip.pin.split('').join(' ')}`}>
          <MIcon name="dialpad" size={22} color={Brand.onPrimary} />
          <Text style={styles.pinLabel}>{t('yourPin')}</Text>
          <Text style={styles.pinValue}>{trip.pin}</Text>
        </Animated.View>
      )}

      {driver && (
        <GlassCard index={2}>
          <InfoRow
            icon="account-hard-hat-outline"
            label={t(driver.verified ? 'driverVerified' : 'driverUnverified')}
            value={driver.name}
            trailing={driver.verified ? <MIcon name="check-decagram" size={20} color={Brand.primary} /> : undefined}
          />
          <InfoRow
            divided
            icon="truck-outline"
            label={t('truckLabel')}
            value={shortVehicleName(trip.vehicle)}
            trailing={trip.registration ? <Plate text={trip.registration} /> : undefined}
          />
          {/* Track record, only from real numbers the server sends (the demo driver's are demo). */}
          {stats && (
            <GlassRow>
              <Stat value={String(stats.trips)} label={t('statTrips')} />
              <Stat value={`${stats.onTimePct}%`} label={t('statOnTime')} divided />
              <Stat value={String(stats.cancels)} label={t('statCancels')} divided />
            </GlassRow>
          )}
        </GlassCard>
      )}

      <GlassCard index={3}>
        <InfoRow icon="map-marker-outline" label={t('pickupLabel')} value={trip.pickup} />
        <InfoRow
          divided
          icon="cash"
          label={t('payDriverChip')}
          value={
            other?.pays === 'them'
              ? `${t('theyPayDriver', { name: firstName(other.name) })} · ₹${formatRupees(trip.amount ?? trip.quote ?? 0)}`
              : `₹${formatRupees(trip.amount ?? trip.quote ?? 0)} · ${t('afterDelivery')}`
          }
        />
      </GlassCard>

      {other && <PersonGrid trip={trip} index={4} />}

      <View>
        <GlassCard index={other ? 5 : 4}>
          <GlassRow divided={false}>
            <ActionCell
              icon="phone-outline"
              label={t('callDriver')}
              disabled={!driver?.phone}
              hint={driver?.phone ? undefined : t('callDemo')}
              onPress={() => driver?.phone && Linking.openURL(`tel:${driver.phone}`)}
            />
            {/* C20: the customer may cancel until the truck reaches pickup; the charge is shown before confirming. */}
            <ActionCell divided danger icon="close-circle-outline" label={t('cancelWord')} onPress={onCancel} />
          </GlassRow>
        </GlassCard>
        {fee > 0 && (
          <Animated.Text entering={rise(other ? 6 : 5)} style={styles.note}>
            {t('cancelFeeNote', { amount: formatRupees(fee) })}
          </Animated.Text>
        )}
      </View>

      <DetailsLink onPress={onDetails} />
    </View>
  );
}

/** The load is moving (C16): minutes first, then how far and how fresh, the driver, the load photos. */
function DeliveringPage({ trip, now, onDetails }: LivePageProps) {
  const styles = useStyles();
  const { t } = useSession();
  // Rule 12: location age is always in words, and an old one is flagged.
  const stale = trip.lastLocationAt ? now - trip.lastLocationAt.getTime() > STALE_LOCATION_MS : true;
  const done = trip.distanceKm != null ? Math.max(0.04, 1 - Math.min(1, trip.distanceKm / DEMO_ROUTE_KM)) : 0.5;
  const driver = trip.driver;
  // The person receiving the load matters most once it is on its way to them.
  const receiver = !!trip.forOther && trip.forOther.meets !== 'pickup';
  const driverAt = receiver ? 4 : 3;
  const photosAt = driverAt + (driver ? 1 : 0);

  return (
    <View style={styles.page}>
      <Animated.View entering={rise(0)} accessibilityLiveRegion="polite">
        <Text style={styles.headline} accessibilityRole="header">
          {trip.etaMinutes != null ? t('deliveryIn', { n: trip.etaMinutes }) : t('stage_in_transit')}
        </Text>
      </Animated.View>

      <GlassCard accent index={1}>
        <View style={styles.legBox}>
          <View style={styles.leg}>
            <View style={[styles.legFill, { width: `${done * 100}%` }]} />
          </View>
        </View>
        <InfoRow divided icon="flag-checkered" label={t('dropLabel')} value={trip.delivery} />
      </GlassCard>

      <GlassCard index={2}>
        <GlassRow divided={false}>
          <GlassCell
            icon="map-marker-distance"
            value={trip.distanceKm != null ? t('kmValue', { n: trip.distanceKm }) : '—'}
            label={t('distanceLeft')}
          />
          <GlassCell
            divided
            icon="crosshairs-gps"
            value={trip.lastLocationAt ? formatAgo(t, trip.lastLocationAt, now) : t('noLocationYet')}
            label={t('truckLocation')}
            warn={stale}
          />
        </GlassRow>
      </GlassCard>

      {receiver && <PersonGrid trip={trip} index={3} />}
      {driver && <DriverGrid trip={trip} index={driverAt} />}

      <Animated.View entering={rise(photosAt)}>
        <LoadPhotos trip={trip} />
      </Animated.View>

      <DetailsLink onPress={onDetails} />
    </View>
  );
}

/** Loading / unloading (C15, C17): the free-time ring, what waiting costs, the driver, the photos arriving. */
function SitePage({ trip, now, onDetails }: LivePageProps) {
  const styles = useStyles();
  const { t } = useSession();
  const loading = trip.stage === 'loading';
  const left = freeSecondsLeft(trip, now);
  const over = left !== null && left <= 0;
  const waiting = tripFare(trip, now).lines.find((line) => line.key === 'waiting');
  // The other person, if they are the one standing at this site.
  const here = !!trip.forOther && (trip.forOther.meets === 'both' || trip.forOther.meets === (loading ? 'pickup' : 'drop'));
  const driverAt = here ? 4 : 3;
  const photosAt = driverAt + (trip.driver ? 1 : 0);

  return (
    <View style={styles.page}>
      <Animated.View entering={rise(0)}>
        <Text style={styles.headline} accessibilityRole="header">
          {t(loading ? 'short_loading' : 'short_unloading')}
        </Text>
        <Text style={styles.sub} numberOfLines={2}>
          {loading ? trip.pickup : trip.delivery}
        </Text>
      </Animated.View>

      {left !== null && (
        <Animated.View entering={rise(1)} style={styles.ring}>
          <SiteTimer secondsLeft={left} label={over ? t('overtimeNow') : t('freeTimeLeft')} size={200} />
        </Animated.View>
      )}

      <GlassCard accent={over} index={2}>
        <GlassRow divided={false}>
          <GlassCell icon="timer-sand" value={`₹${formatRupees(waiting?.amount ?? 0)}`} label={t('extraSoFar')} warn={over} />
          <GlassCell divided icon="clock-outline" value={`₹${waitRate(trip.vehicle)}/${t('minUnit')}`} label={t('afterFree')} />
        </GlassRow>
      </GlassCard>

      {here && <PersonGrid trip={trip} index={3} />}
      {trip.driver && <DriverGrid trip={trip} index={driverAt} />}

      {loading && (
        <Animated.View entering={rise(photosAt)}>
          <LoadPhotos trip={trip} />
        </Animated.View>
      )}

      <DetailsLink onPress={onDetails} />
    </View>
  );
}

/**
 * Booked for someone else: who they are, where they meet the truck, and two
 * actions. "Share trip" opens the phone's own share sheet with the trip
 * details (and the start PIN when they meet the truck at pickup); Pickr sends
 * nothing itself.
 */
function PersonGrid({ trip, index }: { trip: Trip; index: number }) {
  const { t } = useSession();
  const person = trip.forOther!;
  const name = firstName(person.name);
  return (
    <GlassCard index={index}>
      <InfoRow icon="account-arrow-right-outline" label={`${t('bookedFor')} · ${meetsText(t, person.meets)}`} value={personLine(person)} />
      <GlassRow>
        <ActionCell icon="phone-outline" label={t('callPerson', { name })} onPress={() => Linking.openURL(`tel:+91${person.phone}`)} />
        <ActionCell
          divided
          icon="share-variant-outline"
          label={t('shareTrip')}
          onPress={() => {
            choiceHaptic();
            Share.share({ message: shareTripText(t, trip) }).catch(() => {});
          }}
        />
      </GlassRow>
    </GlassCard>
  );
}

/** Driver, truck and Call as one lined grid, for the pages after pickup. */
function DriverGrid({ trip, index }: { trip: Trip; index: number }) {
  const { t } = useSession();
  const driver = trip.driver!;
  return (
    <GlassCard index={index}>
      <InfoRow
        icon="account-hard-hat-outline"
        label={shortVehicleName(trip.vehicle)}
        value={driver.name}
        trailing={trip.registration ? <Plate text={trip.registration} /> : undefined}
      />
      <GlassRow>
        <ActionCell
          icon="phone-outline"
          label={t('callDriver')}
          disabled={!driver.phone}
          hint={driver.phone ? undefined : t('callDemo')}
          onPress={() => driver.phone && Linking.openURL(`tel:${driver.phone}`)}
        />
      </GlassRow>
    </GlassCard>
  );
}

/** One number over its label, centred in a third of the row. */
function Stat({ value, label, divided }: { value: string; label: string; divided?: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.stat, divided && styles.statDivided]} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** A number plate: always black on white, like the real thing. */
function Plate({ text }: { text: string }) {
  const styles = useStyles();
  return (
    <View style={styles.plate}>
      <Text style={styles.plateText}>{text}</Text>
    </View>
  );
}

function DetailsLink({ onPress }: { onPress: () => void }) {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  return (
    <Pressable
      onPress={() => {
        choiceHaptic();
        onPress();
      }}
      accessibilityRole="button"
      hitSlop={6}
      style={styles.details}>
      <Text style={styles.detailsText}>{t('seeTripDetails')}</Text>
      <ChevronRight size={18} color={Brand.link} strokeWidth={2.5} />
    </Pressable>
  );
}

const useStyles = makeStyles((Brand) => ({
  // One column, one gap: every grid sits the same distance from the next.
  page: {
    gap: 12,
  },
  headline: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: Brand.text,
    textAlign: 'center',
  },
  sub: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    color: Brand.muted,
    textAlign: 'center',
  },
  pinBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Brand.primary,
  },
  pinLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Brand.onPrimary,
  },
  pinValue: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 4,
    color: Brand.onPrimary,
    fontVariant: ['tabular-nums'],
  },
  stat: {
    flex: 1,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivided: {
    borderLeftWidth: 1,
    borderLeftColor: Brand.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.muted,
  },
  plate: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#1C1917',
    backgroundColor: '#FFFFFF',
  },
  plateText: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1917',
  },
  note: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: Brand.muted,
    textAlign: 'center',
  },
  legBox: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  leg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.card,
    overflow: 'hidden',
  },
  legFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Brand.primary,
  },
  ring: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  details: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  detailsText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.link,
  },
}));
