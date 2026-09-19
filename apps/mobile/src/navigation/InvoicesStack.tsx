import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useT } from '../i18n';
import InvoicesListScreen from '../screens/invoices/InvoicesListScreen';
import InvoiceDetailScreen from '../screens/invoices/InvoiceDetailScreen';
import type { InvoicesStackParamList } from './types';

const Stack = createNativeStackNavigator<InvoicesStackParamList>();

export default function InvoicesStack() {
  const t = useT();
  return (
    <Stack.Navigator>
      <Stack.Screen name="InvoicesList" component={InvoicesListScreen} options={{ title: t('nav.invoices') }} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
