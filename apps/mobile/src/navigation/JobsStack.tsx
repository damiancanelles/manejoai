import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useT } from '../i18n';
import JobsListScreen from '../screens/jobs/JobsListScreen';
import JobDetailScreen from '../screens/jobs/JobDetailScreen';
import type { JobsStackParamList } from './types';

const Stack = createNativeStackNavigator<JobsStackParamList>();

export default function JobsStack() {
  const t = useT();
  return (
    <Stack.Navigator>
      <Stack.Screen name="JobsList" component={JobsListScreen} options={{ title: t('nav.jobs') }} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
