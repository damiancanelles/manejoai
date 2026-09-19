import { Pressable, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useT } from '../i18n';
import QuotesListScreen from '../screens/quotes/QuotesListScreen';
import QuoteDetailScreen from '../screens/quotes/QuoteDetailScreen';
import QuoteNewScreen from '../screens/quotes/QuoteNewScreen';
import { colors } from '../theme';
import type { QuotesStackParamList } from './types';

const Stack = createNativeStackNavigator<QuotesStackParamList>();

export default function QuotesStack() {
  const t = useT();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="QuotesList"
        component={QuotesListScreen}
        options={({ navigation }) => ({
          title: t('nav.quotes'),
          headerRight: () => (
            <Pressable onPress={() => navigation.navigate('QuoteNew')} hitSlop={8}>
              <Text style={{ color: colors.accent, fontSize: 15, fontWeight: '600' }}>+</Text>
            </Pressable>
          ),
        })}
      />
      <Stack.Screen name="QuoteDetail" component={QuoteDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="QuoteNew" component={QuoteNewScreen} options={{ title: t('quoteNew.title') }} />
    </Stack.Navigator>
  );
}
