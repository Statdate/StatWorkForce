import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getMessageThreads, type MessageThread } from '@/lib/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function MessageThreadsScreen() {
  const router = useRouter();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { threads } = await getMessageThreads();
    setThreads(threads);
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
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            !isLoading ? (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                No conversations yet.
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/messages/[partnerId]',
                  params: { partnerId: item.id, name: `${item.firstName} ${item.lastName}` },
                })
              }>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedView style={styles.nameColumn}>
                  <ThemedText type="smallBold">
                    {item.firstName} {item.lastName}
                  </ThemedText>
                  {item.title && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.title}
                    </ThemedText>
                  )}
                </ThemedView>
                {item.unreadCount > 0 && (
                  <ThemedView style={styles.badge}>
                    <ThemedText type="small" style={styles.badgeText}>
                      {item.unreadCount} new
                    </ThemedText>
                  </ThemedView>
                )}
              </ThemedView>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  list: { padding: Spacing.three, gap: Spacing.two },
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  empty: { textAlign: 'center', marginTop: Spacing.six },
  nameColumn: { backgroundColor: 'transparent', gap: 2 },
  badge: { backgroundColor: '#0f172a', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#fff' },
});
