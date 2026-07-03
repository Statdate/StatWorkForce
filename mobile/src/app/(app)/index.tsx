import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSchedule, type ScheduleAssignment } from '@/lib/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

function formatShift(assignment: ScheduleAssignment) {
  const start = new Date(assignment.shift.startTime);
  const end = new Date(assignment.shift.endTime);
  return `${start.toLocaleDateString()} · ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

export default function ScheduleScreen() {
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { assignments } = await getSchedule();
    setAssignments(assignments);
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
          data={assignments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            !isLoading ? (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                No upcoming shifts yet.
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">{item.shift.unit.name}</ThemedText>
              <ThemedText themeColor="textSecondary">{formatShift(item)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.shift.jobType.name} · {item.status.replaceAll('_', ' ').toLowerCase()}
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
});
