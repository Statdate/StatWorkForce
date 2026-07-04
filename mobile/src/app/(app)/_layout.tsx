import { Tabs } from 'expo-router';
import { Pressable, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { ThemedText } from '@/components/themed-text';
import { HospitalBanner } from '@/components/hospital-banner';

function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <Pressable onPress={signOut} style={{ marginRight: 16 }}>
      <ThemedText type="linkPrimary">Sign out</ThemedText>
    </Pressable>
  );
}

export default function AppTabsLayout() {
  const { user } = useAuth();
  const isWorker = user?.accountType === 'WORKER';

  return (
    <View style={styles.flex}>
      <SafeAreaView edges={['top']}>
        <HospitalBanner />
      </SafeAreaView>
      <Tabs screenOptions={{ headerRight: () => <SignOutButton /> }}>
        <Tabs.Screen name="index" options={{ title: 'My Schedule' }} />
        <Tabs.Screen
          name="time-off"
          options={{ title: isWorker ? 'Time Off' : 'Time Off Requests' }}
        />
        <Tabs.Screen
          name="credentials"
          options={{ title: isWorker ? 'My Credentials' : 'Credential Expirations' }}
        />
        <Tabs.Screen name="messages" options={{ title: 'Messages', headerShown: false }} />
        <Tabs.Screen name="notifications" options={{ title: 'Alerts' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
