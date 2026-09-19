import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useT } from '../i18n';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import type { InvoicesStackParamList } from './types';

const Stack = createNativeStackNavigator<InvoicesStackParamList>();

export default function InvoicesStack() {
  const t = useT();
  return (
    <Stack.Navigator>
      <Stack.Screen name="InvoicesList" options={{ title: t('nav.invoices') }}>
        {() => <PlaceholderScreen title={t('nav.invoices')} note="Invoice list, detail, and creation land in WO-1/WO-2." />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
