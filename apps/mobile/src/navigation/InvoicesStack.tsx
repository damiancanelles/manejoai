import { Pressable, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useT } from '../i18n';
import InvoicesListScreen from '../screens/invoices/InvoicesListScreen';
import InvoiceDetailScreen from '../screens/invoices/InvoiceDetailScreen';
import InvoiceNewScreen from '../screens/invoices/InvoiceNewScreen';
import { colors } from '../theme';
import type { InvoicesStackParamList } from './types';

const Stack = createNativeStackNavigator<InvoicesStackParamList>();

export default function InvoicesStack() {
  const t = useT();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="InvoicesList"
        component={InvoicesListScreen}
        options={({ navigation }) => ({
          title: t('nav.invoices'),
          headerRight: () => (
            <Pressable onPress={() => navigation.navigate('InvoiceNew')} hitSlop={8}>
              <Text style={{ color: colors.accent, fontSize: 15, fontWeight: '600' }}>+</Text>
            </Pressable>
          ),
        })}
      />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="InvoiceNew" component={InvoiceNewScreen} options={{ title: t('invoiceNew.title') }} />
    </Stack.Navigator>
  );
}
