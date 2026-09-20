import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ClockScreen from '../screens/crew/ClockScreen';
import ReportJobScreen from '../screens/crew/ReportJobScreen';
import { useT } from '../i18n';
import { colors } from '../theme';
import type { CrewTabParamList } from './types';

const Tab = createBottomTabNavigator<CrewTabParamList>();

// A crew account's whole app - just these two tabs, nothing else reachable
// (every other backend route is blocked by CrewGuard anyway). See
// RootNavigator's role branch.
export default function CrewTabs() {
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
        name="Clock"
        component={ClockScreen}
        options={{
          title: t('nav.clock'),
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportJobScreen}
        options={{
          title: t('nav.reportJob'),
          tabBarIcon: ({ color, size }) => <Ionicons name="camera-outline" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
