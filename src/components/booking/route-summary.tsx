import { Pressable, Text, View } from 'react-native';

import { Pencil } from '@/components/ui/icons';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { useSession } from '@/lib/session';

type RouteSummaryProps = {
  pickup?: string;
  delivery?: string;
  /** Shown as a pencil button when given. */
  onEdit?: () => void;
};

/** Pickup → delivery as two dotted rows, the same visual language as the route step. */
export function RouteSummary({ pickup, delivery, onEdit }: RouteSummaryProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  return (
    <View style={styles.card}>
      <View style={styles.rows}>
        <Row color={Brand.success} label={pickup ?? t('pickupLocation')} />
        <View style={styles.line} aria-hidden />
        <Row color={Brand.primary} label={delivery ?? t('deliveryLocation')} />
      </View>
      {onEdit && (
        <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={t('change')} hitSlop={8} style={styles.edit}>
          <Pencil size={18} color={Brand.text} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}

function Row({ color, label }: { color: string; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { borderColor: color }]}>
        <View style={[styles.dotCore, { backgroundColor: color }]} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((Brand) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 18,
    backgroundColor: Brand.surface,
  },
  rows: {
    flex: 1,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  line: {
    position: 'absolute',
    left: 7,
    top: 18,
    width: 2,
    height: 12,
    borderRadius: 1,
    backgroundColor: '#D6D3D1',
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Brand.text,
  },
  edit: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
