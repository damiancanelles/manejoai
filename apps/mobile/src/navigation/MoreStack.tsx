import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useT } from '../i18n';
import MoreScreen from '../screens/MoreScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import CustomersStack from './CustomersStack';
import QuotesStack from './QuotesStack';
import type { MoreStackParamList } from './types';

const Stack = createNativeStackNavigator<MoreStackParamList>();

// Everything that doesn't earn its own bottom tab (mirrors the rest of
// Layout.tsx's sidebar links) lives one level under the "More" tab instead
// of crowding a 10-item tab bar.
export default function MoreStack() {
  const t = useT();
  return (
    <Stack.Navigator>
      <Stack.Screen name="More" options={{ title: t('common.more') }}>
        {() => <MoreScreen />}
      </Stack.Screen>
      <Stack.Screen name="Customers" component={CustomersStack} options={{ headerShown: false }} />
      <Stack.Screen name="Quotes" component={QuotesStack} options={{ headerShown: false }} />
      <Stack.Screen name="JobReports" options={{ title: t('nav.jobReports') }}>
        {() => <PlaceholderScreen title={t('nav.jobReports')} note="Telegram job reports awaiting review land in WO-1." />}
      </Stack.Screen>
      <Stack.Screen name="Reports" options={{ title: t('nav.reports') }}>
        {() => <PlaceholderScreen title={t('nav.reports')} note="Job/invoice reports land in WO-1, exported via the native share sheet." />}
      </Stack.Screen>
      <Stack.Screen name="Settings" options={{ title: t('nav.settings') }}>
        {() => <PlaceholderScreen title={t('nav.settings')} note="Business info, Telegram reconnect, and password change land in WO-2." />}
      </Stack.Screen>
      <Stack.Screen name="Billing" options={{ title: t('nav.billing') }}>
        {() => <PlaceholderScreen title={t('nav.billing')} note="Opens Stripe Checkout/Portal in-app - lands in WO-2." />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
