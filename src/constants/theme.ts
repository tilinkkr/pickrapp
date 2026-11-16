/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Signal Orange on white (2026-11-03/04, orange-and-white only since
 * 2026-11-09): white page, stone surfaces, orange for actions and accents.
 * This is the light palette; the dark one is in `src/lib/app-theme.tsx`, and
 * components read the active one through `useBrand()` / `makeStyles()`.
 */
export type Palette = {
  primary: string;
  onPrimary: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  selected: string;
  link: string;
  warning: string;
  warningFill: string;
  danger: string;
  dangerFill: string;
  success: string;
  successFill: string;
  logoAmber: string;
  night: string;
  nightDeep: string;
};

export const Brand: Palette = {
  primary: '#F97316',
  onPrimary: '#1F1F1F',
  background: '#FFFFFF',
  /** Tiles, inputs and grouped rows on the white page. */
  surface: '#F5F5F4',
  card: '#FFFFFF',
  text: '#1C1917',
  muted: '#6B6560',
  border: '#E7E5E4',
  selected: '#FFEDD5',
  /** Darker orange for text and thin strokes: #F97316 is too faint on white outdoors. */
  link: '#C2410C',
  warning: '#C2410C',
  warningFill: '#FFF1E6',
  danger: '#B42318',
  dangerFill: '#FDECEA',
  success: '#15803D',
  successFill: '#E8F5EC',
  /** Logo colours only (splash and logo chips): amber truck on night navy. */
  logoAmber: '#F6B91A',
  night: '#0B1520',
  nightDeep: '#05090E',
};

export const BrandFonts = {
  display: 'Saira_800ExtraBold',
  bold: 'Saira_700Bold',
  semibold: 'Saira_600SemiBold',
  medium: 'Saira_500Medium',
} as const;

const lightColors = {
  text: Brand.text,
  background: Brand.background,
  backgroundElement: Brand.card,
  backgroundSelected: Brand.selected,
  textSecondary: Brand.muted,
};

export const Colors = {
  light: lightColors,
  dark: lightColors,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
