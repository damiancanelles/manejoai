import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/auth/AuthContext';
import { I18nProvider } from './src/i18n';
import RootNavigator from './src/navigation/RootNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A phone's network is flakier than a desktop's - a couple of quiet
      // retries beats surfacing an error for one dropped request on a
      // job site's spotty signal.
      retry: 2,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NavigationContainer>
              <RootNavigator />
              <StatusBar style="auto" />
            </NavigationContainer>
          </AuthProvider>
        </QueryClientProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
