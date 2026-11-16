import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { makeStyles, useBrand } from '@/lib/app-theme';
import type { TripStage } from '@/lib/trips';

/**
 * Material Design icons (the set the pilot driver app uses, so both apps
 * speak the same picture language). Bundled with Expo, so they work in Expo Go.
 * Use these for things people identify at a glance: driver, truck, timer, route.
 */
export type MIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function MIcon({ name, size = 22, color }: { name: MIconName; size?: number; color?: string }) {
  const Brand = useBrand();
  return <MaterialCommunityIcons name={name} size={size} color={color ?? Brand.link} accessible={false} />;
}

type Tone = 'brand' | 'neutral' | 'warn' | 'solid' | 'danger';

/** An icon on a soft rounded square, the one icon treatment used in grids. */
export function IconChip({ name, size = 40, tone = 'brand' }: { name: MIconName; size?: number; tone?: Tone }) {
  const Brand = useBrand();
  const styles = useStyles();
  const color = tone === 'danger' ? Brand.danger : tone === 'solid' ? Brand.onPrimary : tone === 'warn' ? Brand.warning : tone === 'neutral' ? Brand.text : Brand.link;
  return (
    <View
      style={[
        styles.chip,
        { width: size, height: size, borderRadius: Math.round(size * 0.32) },
        tone === 'solid' && styles.solid,
        tone === 'warn' && styles.warn,
        tone === 'neutral' && styles.neutral,
        tone === 'danger' && styles.danger,
      ]}>
      <MIcon name={name} size={Math.round(size * 0.55)} color={color} />
    </View>
  );
}

/** One icon per trip stage, after the pilot's own choices (local_shipping, route, move_to_inbox, payments …). */
export const STAGE_ICON: Record<TripStage, MIconName> = {
  scheduled: 'calendar-clock',
  searching: 'radar',
  to_pickup: 'truck-fast',
  loading: 'tray-arrow-up',
  in_transit: 'map-marker-path',
  unloading: 'tray-arrow-down',
  payment_due: 'cash-multiple',
  completed: 'check-circle',
  cancelled: 'close-circle',
  no_driver: 'magnify-close',
};

const useStyles = makeStyles((Brand) => ({
  chip: {
    backgroundColor: Brand.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: {
    backgroundColor: Brand.primary,
  },
  warn: {
    backgroundColor: Brand.warningFill,
  },
  neutral: {
    backgroundColor: Brand.surface,
  },
  danger: {
    backgroundColor: Brand.dangerFill,
  },
}));
