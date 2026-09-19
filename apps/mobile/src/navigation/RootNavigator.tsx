import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import AuthStack from './AuthStack';
import AppTabs from './AppTabs';
import { colors } from '../theme';

// Auth state alone decides what's on screen - no imperative "navigate to
// /login" call anywhere (there's no URL to push here the way the web
// app's ProtectedRoute has). AuthContext clearing `user` - whether from
// logout() or the API client's 401 handler - is enough to swap this back
// to AuthStack on its own.
export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return user ? <AppTabs /> : <AuthStack />;
}
