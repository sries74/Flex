import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { LoadingState } from '@/components/ui/ScreenState';
import { getAuthService, type AuthService } from '@/lib/auth';

export const unstable_settings = { anchor: '(tabs)' };

function RootNavigator() {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingState message="Restoring your session…" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout({ service }: { service?: AuthService }) {
  const authService = useMemo(() => service ?? getAuthService(), [service]);
  return (
    <AuthProvider service={authService}>
      <StatusBar style="auto" />
      <RootNavigator />
    </AuthProvider>
  );
}
