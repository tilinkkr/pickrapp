import { createContext } from 'react';

import type { SessionContextValue } from './session';

/**
 * The session context lives in its own tiny module so it is created once.
 * When `session.tsx` re-runs during Fast Refresh (for example after editing
 * the strings it imports), it keeps using this same context object instead
 * of making a new one that the mounted provider knows nothing about, which
 * used to crash with "useSession must be used inside SessionProvider".
 */
export const SessionContext = createContext<SessionContextValue | null>(null);
