import { Tabs } from 'expo-router';

import { LiveTripBar } from '@/components/home/active-delivery';
import { TabBar } from '@/components/navigation/tab-bar';
import { Brand } from '@/constants/theme';
import { useSession } from '@/lib/session';

/** Four customer tabs (agreed 2026-11-03 over the handoff's three). */
export default function TabsLayout() {
  const { t } = useSession();

  return (
    <Tabs
      tabBar={(props) => (
        <>
          {/* The live trip rides above the tab bar on every tab. */}
          <LiveTripBar />
          <TabBar {...props} />
        </>
      )}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        sceneStyle: { backgroundColor: Brand.card },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabHome') }} />
      <Tabs.Screen name="my-loads" options={{ title: t('tabLoads') }} />
      <Tabs.Screen name="requests" options={{ title: t('tabRequests') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabProfile') }} />
    </Tabs>
  );
}
