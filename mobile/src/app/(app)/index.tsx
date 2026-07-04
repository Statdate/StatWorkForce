import { useCallback, useEffect, useState } from 'react';
import { SectionList, RefreshControl, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getSchedule,
  getOpenShifts,
  signUpForShift,
  type ScheduleAssignment,
  type OpenShift,
} from '@/lib/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

function formatRange(startTime: string, endTime: string) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return `${start.toLocaleDateString()} · ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

type Section =
  | { key: 'mine'; title: string; data: ScheduleAssignment[] }
  | { key: 'open'; title: string; data: OpenShift[] };

export default function ScheduleScreen() {
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [openShifts, setOpenShifts] = useState<OpenShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingShiftId, setPendingShiftId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ assignments }, { shifts }] = await Promise.all([getSchedule(), getOpenShifts()]);
    setAssignments(assignments);
    setOpenShifts(shifts);
  }, []);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  async function onRefresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  async function handleSignUp(shiftId: string) {
    setPendingShiftId(shiftId);
    try {
      await signUpForShift(shiftId);
      await load();
    } finally {
      setPendingShiftId(null);
    }
  }

  const sections: Section[] = [
    { key: 'mine', title: 'My Shifts', data: assignments },
    { key: 'open', title: 'Open Shifts', data: openShifts },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <SectionList<ScheduleAssignment | OpenShift, Section>
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          renderSectionHeader={({ section }) => (
            <ThemedView type="background" style={styles.sectionHeader}>
              <ThemedText type="smallBold">{section.title}</ThemedText>
            </ThemedView>
          )}
          renderSectionFooter={({ section }) =>
            !isLoading && section.data.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                {section.key === 'mine' ? 'No upcoming shifts yet.' : 'No open shifts right now.'}
              </ThemedText>
            ) : null
          }
          renderItem={({ item, section }) => {
            if (section.key === 'mine') {
              const assignment = item as ScheduleAssignment;
              const isPublished = assignment.shift.schedulePeriod?.status === 'PUBLISHED';
              return (
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedView style={styles.cardTitleRow}>
                    <ThemedText type="smallBold">{assignment.shift.unit.name}</ThemedText>
                    {isPublished && (
                      <ThemedView style={styles.publishedBadge}>
                        <ThemedText type="small" style={styles.publishedText}>
                          Published
                        </ThemedText>
                      </ThemedView>
                    )}
                  </ThemedView>
                  <ThemedText themeColor="textSecondary">
                    {formatRange(assignment.shift.startTime, assignment.shift.endTime)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {assignment.shift.jobType.name} ·{' '}
                    {assignment.status.replaceAll('_', ' ').toLowerCase()}
                  </ThemedText>
                </ThemedView>
              );
            }

            const shift = item as OpenShift;
            return (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">{shift.unit.name}</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {formatRange(shift.startTime, shift.endTime)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {shift.jobType.name} · {shift.signedUpCount} / {shift.requiredCount} signed up
                </ThemedText>
                <Pressable
                  onPress={() => handleSignUp(shift.id)}
                  disabled={pendingShiftId === shift.id}
                  style={[styles.actionButton, styles.signUpButton]}>
                  <ThemedText type="small" style={styles.signUpText}>
                    {pendingShiftId === shift.id ? 'Signing up…' : 'Sign up'}
                  </ThemedText>
                </Pressable>
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
  sectionHeader: { paddingVertical: Spacing.two },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: 4, marginBottom: Spacing.two },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  publishedBadge: {
    backgroundColor: '#059669',
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  publishedText: { color: '#fff' },
  empty: { paddingVertical: Spacing.two },
  actionButton: { alignSelf: 'flex-start', marginTop: Spacing.one },
  signUpButton: {
    backgroundColor: '#0f172a',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  signUpText: { color: '#fff', fontWeight: '600' },
});
