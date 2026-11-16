import { Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Truck, Weight } from '@/components/ui/icons';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { PrimaryButton } from '@/components/ui/primary-button';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { pick, type Vehicle } from '@/lib/catalog';
import { useSession } from '@/lib/session';
import { formatRupees } from '@/lib/trip-format';

type FleetSheetProps = {
  vehicle: Vehicle | null;
  onClose: () => void;
  onBook: () => void;
};

/**
 * Truck details from Home (C02): picture, name, capacity and a note that the
 * picture shows the type, not the exact truck. Not a booking promise; the
 * booking flow decides which trucks suit the load.
 */
export function FleetSheet({ vehicle, onClose, onBook }: FleetSheetProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const { t, language } = useSession();
  return (
    <BottomSheet visible={vehicle !== null} title={vehicle?.name ?? ''} closeLabel={t('close')} onClose={onClose}>
      {vehicle && (
        <View style={styles.body}>
          <ImagePlaceholder source={vehicle.image} tint={['#CBD2DA', '#6B7480']} icon={Truck} style={styles.image} />
          <Text style={styles.local}>{pick(vehicle.local, language)}</Text>
          <View style={styles.row}>
            <Weight size={18} color={Brand.text} strokeWidth={2} />
            <Text style={styles.capacity}>{pick(vehicle.capacity, language)}</Text>
          </View>
          <Text style={styles.rate}>{t('fromPerLoad', { amount: formatRupees(vehicle.ratePerLoad) })}</Text>
          <Text style={styles.note}>{t('representativeImage')}</Text>
          <View style={styles.actions}>
            <PrimaryButton label={t('startBooking')} onPress={onBook} />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const useStyles = makeStyles((Brand) => ({
  body: {
    gap: 8,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 18,
  },
  local: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '600',
    color: Brand.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  capacity: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Brand.text,
  },
  rate: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.link,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    color: Brand.muted,
  },
  actions: {
    marginTop: 8,
  },
}));
