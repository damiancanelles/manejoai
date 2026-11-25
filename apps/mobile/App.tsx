import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/auth/AuthContext';
import { I18nProvider } from './src/i18n';
import RootNavigator from './src/navigation/RootNavigator';
import { reportClientError } from './src/api/client';

// Report uncaught JS errors (then let React Native's own handler do what it
// always did - red box in dev, crash in a release build). ErrorUtils is a
// React Native global; guarded in case it's ever missing.
const errorUtils = (globalThis as any).ErrorUtils;
if (errorUtils?.getGlobalHandler && errorUtils?.setGlobalHandler) {
  const previousHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    const err = error instanceof Error ? error : new Error(String(error));
    reportClientError(err.message, err.stack, isFatal ? 'fatal' : undefined);
    previousHandler?.(error, isFatal);
  });
}

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
