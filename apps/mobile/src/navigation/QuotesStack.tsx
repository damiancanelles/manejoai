import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useT } from '../i18n';
import QuotesListScreen from '../screens/quotes/QuotesListScreen';
import QuoteDetailScreen from '../screens/quotes/QuoteDetailScreen';
import type { QuotesStackParamList } from './types';

const Stack = createNativeStackNavigator<QuotesStackParamList>();

export default function QuotesStack() {
  const t = useT();
  return (
    <Stack.Navigator>
      <Stack.Screen name="QuotesList" component={QuotesListScreen} options={{ title: t('nav.quotes') }} />
      <Stack.Screen name="QuoteDetail" component={QuoteDetailScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
