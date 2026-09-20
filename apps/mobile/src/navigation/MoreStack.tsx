import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useT } from '../i18n';
import MoreScreen from '../screens/MoreScreen';
import CustomersStack from './CustomersStack';
import QuotesStack from './QuotesStack';
import ReportsScreen from '../screens/reports/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BillingScreen from '../screens/BillingScreen';
import JobReportsScreen from '../screens/JobReportsScreen';
import TeamScreen from '../screens/TeamScreen';
import TeamMemberDetailScreen from '../screens/TeamMemberDetailScreen';
import type { MoreStackParamList } from './types';

const Stack = createNativeStackNavigator<MoreStackParamList>();

// Everything that doesn't earn its own bottom tab (mirrors the rest of
// Layout.tsx's sidebar links) lives one level under the "More" tab instead
// of crowding a 10-item tab bar.
export default function MoreStack() {
  const t = useT();
  return (
    <Stack.Navigator>
      <Stack.Screen name="MoreHome" options={{ title: t('common.more') }}>
        {() => <MoreScreen />}
      </Stack.Screen>
      <Stack.Screen name="Customers" component={CustomersStack} options={{ headerShown: false }} />
      <Stack.Screen name="Quotes" component={QuotesStack} options={{ headerShown: false }} />
      <Stack.Screen name="JobReports" component={JobReportsScreen} options={{ title: t('nav.jobReports') }} />
      <Stack.Screen name="Team" component={TeamScreen} options={{ title: t('nav.team') }} />
      <Stack.Screen name="TeamMemberDetail" component={TeamMemberDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: t('nav.reports') }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
      <Stack.Screen name="Billing" component={BillingScreen} options={{ title: t('nav.billing') }} />
    </Stack.Navigator>
  );
}
