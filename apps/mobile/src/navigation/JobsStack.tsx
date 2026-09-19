import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useT } from '../i18n';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import type { JobsStackParamList } from './types';

const Stack = createNativeStackNavigator<JobsStackParamList>();

export default function JobsStack() {
  const t = useT();
  return (
    <Stack.Navigator>
      <Stack.Screen name="JobsList" options={{ title: t('nav.jobs') }}>
        {() => <PlaceholderScreen title={t('nav.jobs')} note="Job list, detail, and camera-first photo capture land in WO-1/WO-2." />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
