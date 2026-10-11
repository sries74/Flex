import { Tabs } from 'expo-router';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';

export default function TabsLayout() {
  const { service } = useAuth();
  return (
    <Tabs
      screenOptions={{
        headerRight: () => (
          <Button title="Sign out" variant="ghost" onPress={() => void service.signOut()} />
        ),
      }}
    >
      <Tabs.Screen name="itinerary" options={{ title: 'Itinerary' }} />
      <Tabs.Screen name="camera" options={{ title: 'Camera' }} />
      <Tabs.Screen name="route" options={{ title: 'Route' }} />
    </Tabs>
  );
}
