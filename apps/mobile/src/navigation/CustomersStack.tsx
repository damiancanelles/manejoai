import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useT } from '../i18n';
import CustomersListScreen from '../screens/customers/CustomersListScreen';
import CustomerDetailScreen from '../screens/customers/CustomerDetailScreen';
import type { CustomersStackParamList } from './types';

const Stack = createNativeStackNavigator<CustomersStackParamList>();

export default function CustomersStack() {
  const t = useT();
  return (
    <Stack.Navigator>
      <Stack.Screen name="CustomersList" component={CustomersListScreen} options={{ title: t('nav.customers') }} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
