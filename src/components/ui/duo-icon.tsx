import type { LucideIcon } from '@/components/ui/icons';

import { Brand } from '@/constants/theme';

type DuoIconProps = {
  icon: LucideIcon;
  size?: number;
  color?: string;
  fill?: string;
};

/** Lucide icon drawn two-tone: a 2px stroke with a 30% fill inside closed shapes. */
export function DuoIcon({ icon: Icon, size = 22, color = Brand.onPrimary, fill = Brand.primary }: DuoIconProps) {
  return <Icon size={size} color={color} strokeWidth={2} fill={fill} fillOpacity={0.3} />;
}
