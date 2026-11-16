import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { Brand, type Palette } from '@/constants/theme';

/**
 * Dark palette: warm charcoal surfaces, not pure black, so orange stays
 * calm; text is warm off-white. Orange buttons keep dark text in both modes.
 */
export const DarkBrand: Palette = {
  ...Brand,
  background: '#121110',
  surface: '#1E1C1A',
  card: '#171513',
  text: '#F5F2EF',
  muted: '#B8B2AD',
  border: '#3A3531',
  // Orange must stay readable on dark: a clearly orange-brown fill and a bright orange for text and strokes.
  selected: '#5A2E0E',
  link: '#FDA35A',
  warning: '#FDA35A',
  warningFill: '#4A2A12',
  danger: '#F87171',
  dangerFill: '#3A1A1A',
  success: '#4ADE80',
  successFill: '#14301F',
};

export type ThemePreference = 'system' | 'light' | 'dark';
const KEY = 'pickr.theme';

type ThemeValue = { brand: Palette; dark: boolean; preference: ThemePreference; setPreference: (p: ThemePreference) => void };
const ThemeContext = createContext<ThemeValue>({ brand: Brand, dark: false, preference: 'system', setPreference: () => {} });

/** Light or dark for the whole app: the saved choice, or the phone's setting on "Auto". */
export function AppThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') setPreferenceState(saved);
      })
      .catch(() => {});
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(KEY, next).catch(() => {});
  }, []);

  const dark = preference === 'dark' || (preference === 'system' && system === 'dark');
  const value = useMemo(() => ({ brand: dark ? DarkBrand : Brand, dark, preference, setPreference }), [dark, preference, setPreference]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

/** The active palette; components read colours from here so they follow light/dark. */
export function useBrand() {
  return useContext(ThemeContext).brand;
}

/**
 * Style sheets that follow the theme: write `makeStyles((Brand) => ({ … }))`
 * at module level and call the returned hook inside the component. Each
 * palette's sheet is built once and cached.
 */
type StyleInput = Parameters<typeof StyleSheet.create>[0];

export function makeStyles<T extends StyleInput>(factory: (brand: Palette) => T) {
  const cache = new Map<Palette, Readonly<T>>();
  return function useStyles(): Readonly<T> {
    const brand = useBrand();
    let styles = cache.get(brand);
    if (!styles) {
      styles = StyleSheet.create(factory(brand));
      cache.set(brand, styles);
    }
    return styles;
  };
}
