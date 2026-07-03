import { useCallback, useEffect, useState } from 'react';
import { SectionList, RefreshControl, StyleSheet, Pressable, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getSchedule,
  getOpenShifts,
  signUpForShift,
  dropShift,
  type ScheduleAssignment,
  type OpenShift,
} from '@/lib/api';
import { syncAssignmentsToCalendar, CALENDAR_SYNC_SUPPORTED } from '@/lib/calendar';
import { getAlarmOffsetMinutes, setAlarmOffsetMinutes } from '@/lib/settings';
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

  const [alarmOffset, setAlarmOffsetState] = useState('60');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ assignments }, { shifts }] = await Promise.all([getSchedule(), getOpenShifts()]);
    setAssignments(assignments);
    setOpenShifts(shifts);
  }, []);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
    getAlarmOffsetMinutes().then((minutes) => setAlarmOffsetState(String(minutes)));
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

  async function handleCancel(shiftId: string) {
    setPendingShiftId(shiftId);
    try {
      await dropShift(shiftId);
      await load();
    } finally {
      setPendingShiftId(null);
    }
  }

  async function handleAlarmOffsetChange(value: string) {
    setAlarmOffsetState(value);
    const minutes = Number(value);
    if (Number.isFinite(minutes) && minutes >= 0) {
      await setAlarmOffsetMinutes(minutes);
    }
  }

  async function handleSync() {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncAssignmentsToCalendar(assignments, Number(alarmOffset) || 0);
      const parts = [`${result.syncedCount} added`];
      if (result.skippedCount > 0) parts.push(`${result.skippedCount} already synced or not yet published`);
      if (result.errorCount > 0) parts.push(`${result.errorCount} failed`);
      setSyncMessage(parts.join(' · '));
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Sync failed.');
    } finally {
      setIsSyncing(false);
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
          ListHeaderComponent={
            <ThemedView type="backgroundElement" style={styles.syncCard}>
              <ThemedText type="smallBold">Calendar sync</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Adds your published shifts to your phone calendar with a reminder before each one.
              </ThemedText>
              <ThemedView style={styles.offsetRow}>
                <ThemedText type="small">Remind me</ThemedText>
                <TextInput
                  value={alarmOffset}
                  onChangeText={handleAlarmOffsetChange}
                  keyboardType="number-pad"
                  style={styles.offsetInput}
                />
                <ThemedText type="small">minutes before each shift</ThemedText>
              </ThemedView>
              {CALENDAR_SYNC_SUPPORTED ? (
                <Pressable
                  onPress={handleSync}
                  disabled={isSyncing}
                  style={[styles.actionButton, styles.signUpButton, styles.syncButton]}>
                  <ThemedText type="small" style={styles.signUpText}>
                    {isSyncing ? 'Syncing…' : 'Sync to Calendar'}
                  </ThemedText>
                </Pressable>
              ) : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.webNotice}>
                  Calendar sync requires the native app (not available in the web preview).
                </ThemedText>
              )}
              {syncMessage && (
                <ThemedText type="small" themeColor="textSecondary">
                  {syncMessage}
                </ThemedText>
              )}
            </ThemedView>
          }
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
                  {assignment.status === 'SELF_SCHEDULED' && (
                    <Pressable
                      onPress={() => handleCancel(assignment.shiftId)}
                      disabled={pendingShiftId === assignment.shiftId}
                      style={styles.actionButton}>
                      <ThemedText type="small" style={styles.cancelText}>
                        {pendingShiftId === assignment.shiftId ? 'Cancelling…' : 'Cancel'}
                      </ThemedText>
                    </Pressable>
                  )}
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
  cancelText: { color: '#dc2626' },
  signUpButton: {
    backgroundColor: '#0f172a',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  signUpText: { color: '#fff', fontWeight: '600' },
  syncCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  offsetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, flexWrap: 'wrap' },
  offsetInput: {
    backgroundColor: '#fff',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    minWidth: 50,
    textAlign: 'center',
  },
  syncButton: { alignSelf: 'flex-start' },
  webNotice: { fontStyle: Platform.OS === 'web' ? 'italic' : undefined },
});
