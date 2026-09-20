import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import AuthStack from './AuthStack';
import AppTabs from './AppTabs';
import CrewTabs from './CrewTabs';
import { colors } from '../theme';

// Auth state alone decides what's on screen - no imperative "navigate to
// /login" call anywhere (there's no URL to push here the way the web
// app's ProtectedRoute has). AuthContext clearing `user` - whether from
// logout() or the API client's 401 handler - is enough to swap this back
// to AuthStack on its own.
//
// A CREW account gets a completely different, minimal tab set (CrewTabs) -
// crew is mobile-only and every backend route besides theirs is blocked by
// CrewGuard, so there's nothing for the full AppTabs shell to show them.
export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!user) return <AuthStack />;
  return user.role === 'CREW' ? <CrewTabs /> : <AppTabs />;
}
