import { Pressable, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useT } from '../i18n';
import JobsListScreen from '../screens/jobs/JobsListScreen';
import JobDetailScreen from '../screens/jobs/JobDetailScreen';
import JobNewScreen from '../screens/jobs/JobNewScreen';
import { colors } from '../theme';
import type { JobsStackParamList } from './types';

const Stack = createNativeStackNavigator<JobsStackParamList>();

export default function JobsStack() {
  const t = useT();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="JobsList"
        component={JobsListScreen}
        options={({ navigation }) => ({
          title: t('nav.jobs'),
          headerRight: () => (
            <Pressable onPress={() => navigation.navigate('JobNew')} hitSlop={8}>
              <Text style={{ color: colors.accent, fontSize: 15, fontWeight: '600' }}>+</Text>
            </Pressable>
          ),
        })}
      />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="JobNew" component={JobNewScreen} options={{ title: t('jobNew.title') }} />
    </Stack.Navigator>
  );
}
