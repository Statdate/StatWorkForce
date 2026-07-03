import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCredentials, type Credential } from '@/lib/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;

function credentialStatus(expirationDate: string) {
  const expiresAt = new Date(expirationDate).getTime();
  const now = Date.now();
  if (expiresAt < now) return { label: 'Expired', color: '#dc2626' };
  if (expiresAt - now < TWO_MONTHS_MS) return { label: 'Expiring soon', color: '#d97706' };
  return { label: 'Current', color: '#059669' };
}

export default function CredentialsScreen() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { credentials } = await getCredentials();
    setCredentials(credentials);
  }, []);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  async function onRefresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <FlatList
          data={credentials}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            !isLoading ? (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                No credentials on file yet.
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => {
            const status = credentialStatus(item.expirationDate);
            return (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">
                  {item.customName ?? item.type.replaceAll('_', ' ')}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {item.issuingBody ?? 'Issuing body not set'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Expires {new Date(item.expirationDate).toLocaleDateString()}
                </ThemedText>
                <ThemedText type="small" style={{ color: status.color }}>
                  {status.label}
                </ThemedText>
              </ThemedView>
            );
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  list: { padding: Spacing.three, gap: Spacing.two },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: 4 },
  empty: { textAlign: 'center', marginTop: Spacing.six },
});
