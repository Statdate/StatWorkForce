import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getNotifications, type AppNotification } from '@/lib/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    // markRead: viewing the list is what "reads" it — same as the web page.
    const { notifications } = await getNotifications(true);
    setNotifications(notifications);
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
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            !isLoading ? (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                Nothing yet — you&apos;re all caught up.
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedView style={styles.titleRow}>
                <ThemedText type="smallBold" style={styles.title}>
                  {item.title}
                </ThemedText>
                {!item.readAt && (
                  <ThemedView style={styles.newBadge}>
                    <ThemedText type="small" style={styles.newBadgeText}>
                      New
                    </ThemedText>
                  </ThemedView>
                )}
              </ThemedView>
              {item.body && (
                <ThemedText type="small" themeColor="textSecondary">
                  {item.body}
                </ThemedText>
              )}
              <ThemedText type="small" themeColor="textSecondary">
                {new Date(item.sentAt).toLocaleDateString()}
              </ThemedText>
            </ThemedView>
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
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: 4 },
  empty: { textAlign: 'center', marginTop: Spacing.six },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  title: { flexShrink: 1 },
  newBadge: {
    backgroundColor: '#d97706',
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  newBadgeText: { color: '#fff' },
});
