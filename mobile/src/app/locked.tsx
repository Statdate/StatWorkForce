import { useEffect, useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function LockedScreen() {
  const { user, unlock, signOut } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlock() {
    setError(null);
    setIsAuthenticating(true);
    try {
      const success = await unlock();
      if (!success) setError("Couldn't verify — try again.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  // Prompt automatically on arrival so the user isn't stuck tapping through
  // an extra screen every time they reopen the app.
  useEffect(() => {
    handleUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Stat Workforce
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Welcome back{user ? `, ${user.firstName}` : ''}. Unlock to continue.
        </ThemedText>

        {error && (
          <ThemedText style={styles.error}>{error}</ThemedText>
        )}

        <Pressable onPress={handleUnlock} disabled={isAuthenticating} style={styles.button}>
          {isAuthenticating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.buttonText}>Unlock with Face ID / Touch ID</ThemedText>
          )}
        </Pressable>

        <Pressable onPress={signOut} style={styles.signOutButton}>
          <ThemedText type="linkPrimary">Use password instead</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: Spacing.three },
  error: { color: '#dc2626', textAlign: 'center' },
  button: {
    backgroundColor: '#0f172a',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  signOutButton: { alignItems: 'center', marginTop: Spacing.two },
});
