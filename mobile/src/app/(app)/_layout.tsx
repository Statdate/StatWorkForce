import { Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { ThemedText } from '@/components/themed-text';

function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <Pressable onPress={signOut} style={{ marginRight: 16 }}>
      <ThemedText type="linkPrimary">Sign out</ThemedText>
    </Pressable>
  );
}

export default function AppTabsLayout() {
  return (
    <Tabs screenOptions={{ headerRight: () => <SignOutButton /> }}>
      <Tabs.Screen name="index" options={{ title: 'My Schedule' }} />
      <Tabs.Screen name="time-off" options={{ title: 'Time Off' }} />
      <Tabs.Screen name="credentials" options={{ title: 'My Credentials' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', headerShown: false }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
