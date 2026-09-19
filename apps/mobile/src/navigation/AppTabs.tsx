import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import JobsStack from './JobsStack';
import InvoicesStack from './InvoicesStack';
import MoreStack from './MoreStack';
import AssistantScreen from '../screens/AssistantScreen';
import { useT } from '../i18n';
import { colors } from '../theme';
import type { AppTabParamList } from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();

// Five tabs, not the sidebar's eleven links - Customers/Quotes/Job Reports/
// Reports/Settings/Billing live one level under "More" instead (see
// MoreStack). Platform (super-admin) has no tab at all: it's Damian's own
// internal view and stays web-only per the mobile build plan.
export default function AppTabs() {
  const t = useT();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: t('nav.dashboard'),
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Jobs"
        component={JobsStack}
        options={{
          title: t('nav.jobs'),
          tabBarIcon: ({ color, size }) => <Ionicons name="hammer-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Invoices"
        component={InvoicesStack}
        options={{
          title: t('nav.invoices'),
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Assistant"
        component={AssistantScreen}
        options={{
          title: 'Assistant',
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreStack}
        options={{
          title: t('common.more'),
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-circle-outline" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
