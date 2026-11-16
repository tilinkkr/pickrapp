import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { type Language, type StringKey, translate } from './i18n';
import { SessionContext } from './session-context';

export type CustomerType = 'individual' | 'business';

/**
 * DPDP Act 2023 consent record: what the customer agreed to and when.
 * `bookings` is required to use the service; the rest are optional and can
 * be withdrawn any time in Profile › Privacy & data.
 */
export type Consent = {
  bookings: true;
  location: boolean;
  whatsapp: boolean;
  /** ISO time the choices were last given or changed. */
  at: string;
};

export type PayMethod = 'gpay' | 'whatsapp' | 'cash';

export type CustomerProfile = {
  name: string;
  /** Optional; empty when not given. */
  email: string;
  customerType: CustomerType;
  /** WhatsApp number for trip updates (10 digits); defaults to the mobile number. */
  whatsapp?: string;
  consent?: Consent;
  /** How the customer usually pays the driver (shown to the driver; Pickr takes no payment). */
  payMethod?: PayMethod;
  /** Notification choices from Profile › Notifications. */
  notify?: { trip: boolean; whatsapp: boolean; offers: boolean };
  /** Local file URI from the photo picker; not uploaded anywhere yet. */
  photoUri?: string;
};

/** Customers without a profile are sent to /register right after OTP. */
export type Session =
  | { kind: 'guest' }
  | ({ kind: 'customer'; phone: string } & Partial<CustomerProfile>);

/**
 * The number entered on the login screen. `verified` flips once the OTP is
 * accepted and a new customer still has to register. Never persisted.
 */
export type PendingSignIn = { phone: string; verified?: boolean };

const SESSION_KEY = 'pickr.session';
const LANGUAGE_KEY = 'pickr.language';

export type SessionContextValue = {
  /** False until the saved session and language have been read from storage. */
  loaded: boolean;
  session: Session | null;
  language: Language;
  setLanguage: (language: Language) => void;
  pending: PendingSignIn | null;
  setPending: (pending: PendingSignIn | null) => void;
  signIn: (session: Session) => void;
  /** Changes the signed-in customer's own profile fields (WhatsApp, email, consent). */
  updateProfile: (patch: Partial<CustomerProfile>) => void;
  signOut: () => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
};



function persist(key: string, value: string | null) {
  const write = value === null ? AsyncStorage.removeItem(key) : AsyncStorage.setItem(key, value);
  write.catch(() => {});
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [language, setLanguageState] = useState<Language>('en');
  const [pending, setPending] = useState<PendingSignIn | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.multiGet([SESSION_KEY, LANGUAGE_KEY])
      .then(([[, savedSession], [, savedLanguage]]) => {
        if (cancelled) return;
        if (savedSession) setSession(JSON.parse(savedSession) as Session);
        if (savedLanguage === 'en' || savedLanguage === 'ml') setLanguageState(savedLanguage);
      })
      // Unreadable storage means a fresh start, not a stuck app.
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    persist(LANGUAGE_KEY, next);
  }, []);

  const signIn = useCallback((next: Session) => {
    setPending(null);
    setSession(next);
    persist(SESSION_KEY, JSON.stringify(next));
  }, []);

  const updateProfile = useCallback((patch: Partial<CustomerProfile>) => {
    setSession((current) => {
      if (current?.kind !== 'customer') return current;
      const next = { ...current, ...patch };
      persist(SESSION_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    persist(SESSION_KEY, null);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      loaded,
      session,
      language,
      setLanguage,
      pending,
      setPending,
      signIn,
      updateProfile,
      signOut,
      t: (key, vars) => translate(language, key, vars),
    }),
    [loaded, session, language, setLanguage, pending, signIn, updateProfile, signOut]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
