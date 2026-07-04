import { useCallback, useEffect, useState } from 'react';
import { ScrollView, RefreshControl, StyleSheet, Pressable, TextInput, Platform, Modal, FlatList, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSchedule, type ScheduleAssignment } from '@/lib/api';
import { syncAssignmentsToCalendar, listWritableCalendars, CALENDAR_SYNC_SUPPORTED, type PickableCalendar } from '@/lib/calendar';
import { getAlarmOffsetMinutes, setAlarmOffsetMinutes, getSelectedCalendar, setSelectedCalendar } from '@/lib/settings';
import { isBiometricAvailable, isBiometricEnabled, setBiometricEnabled, authenticateWithBiometrics } from '@/lib/biometric';
import { useAuth } from '@/lib/auth-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const { user } = useAuth();
  const isWorker = user?.accountType === 'WORKER';

  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricOn, setIsBiometricOn] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [isTogglingBiometric, setIsTogglingBiometric] = useState(false);

  const [alarmOffset, setAlarmOffsetState] = useState('60');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [calendarLabel, setCalendarLabel] = useState('Default calendar');
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [pickableCalendars, setPickableCalendars] = useState<PickableCalendar[]>([]);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isWorker) return;
    const { assignments } = await getSchedule();
    setAssignments(assignments);
  }, [isWorker]);

  useEffect(() => {
    isBiometricAvailable().then(setIsBiometricSupported);
    isBiometricEnabled().then(setIsBiometricOn);
  }, []);

  useEffect(() => {
    if (!isWorker) return;
    load();
    getAlarmOffsetMinutes().then((minutes) => setAlarmOffsetState(String(minutes)));
    getSelectedCalendar().then((selection) => {
      if (selection) {
        setCalendarId(selection.id);
        setCalendarLabel(selection.label);
      }
    });
  }, [load, isWorker]);

  async function onRefresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  async function handleToggleBiometric(next: boolean) {
    setBiometricError(null);
    setIsTogglingBiometric(true);
    try {
      if (next) {
        // Confirm biometrics actually work on this device before persisting
        // the setting — otherwise the user could lock themselves into a
        // broken unlock screen on next launch.
        const verified = await authenticateWithBiometrics('Confirm Face ID / Touch ID to enable app lock');
        if (!verified) {
          setBiometricError("Couldn't verify — app lock was not enabled.");
          return;
        }
      }
      await setBiometricEnabled(next);
      setIsBiometricOn(next);
    } finally {
      setIsTogglingBiometric(false);
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
      const result = await syncAssignmentsToCalendar(assignments, Number(alarmOffset) || 0, calendarId);
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

  async function handleOpenCalendarPicker() {
    setPickerError(null);
    setIsPickerVisible(true);
    setIsLoadingCalendars(true);
    try {
      const calendars = await listWritableCalendars();
      setPickableCalendars(calendars);
    } catch (error) {
      setPickerError(error instanceof Error ? error.message : 'Could not load calendars.');
    } finally {
      setIsLoadingCalendars(false);
    }
  }

  async function handleSelectCalendar(calendar: PickableCalendar) {
    const label = `${calendar.title} (${calendar.sourceName})`;
    setCalendarId(calendar.id);
    setCalendarLabel(label);
    await setSelectedCalendar({ id: calendar.id, label });
    setIsPickerVisible(false);
  }

  async function handleUseDefaultCalendar() {
    setCalendarId(null);
    setCalendarLabel('Default calendar');
    await setSelectedCalendar(null);
    setIsPickerVisible(false);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}>
          <ThemedView type="backgroundElement" style={styles.syncCard}>
            <ThemedText type="smallBold">Security</ThemedText>
            {isBiometricSupported ? (
              <>
                <ThemedView style={styles.offsetRow}>
                  <ThemedText type="small" style={styles.flexShrink}>
                    Require Face ID / Touch ID to open the app
                  </ThemedText>
                  <Switch
                    value={isBiometricOn}
                    onValueChange={handleToggleBiometric}
                    disabled={isTogglingBiometric}
                  />
                </ThemedView>
                {biometricError && (
                  <ThemedText type="small" style={styles.errorText}>
                    {biometricError}
                  </ThemedText>
                )}
              </>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                No Face ID / Touch ID enrolled on this device.
              </ThemedText>
            )}
          </ThemedView>

          {isWorker && (
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
              {CALENDAR_SYNC_SUPPORTED && (
                <ThemedView style={styles.offsetRow}>
                  <ThemedText type="small">Calendar</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.calendarLabel}>
                    {calendarLabel}
                  </ThemedText>
                  <Pressable onPress={handleOpenCalendarPicker}>
                    <ThemedText type="linkPrimary">Change</ThemedText>
                  </Pressable>
                </ThemedView>
              )}
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
          )}
        </ScrollView>
      </SafeAreaView>
      <Modal
        visible={isPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsPickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsPickerVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <ThemedView type="background" style={styles.modalContent}>
              <ThemedText type="smallBold">Choose a calendar</ThemedText>
              {isLoadingCalendars && <ThemedText type="small">Loading calendars…</ThemedText>}
              {pickerError && (
                <ThemedText type="small" style={styles.errorText}>
                  {pickerError}
                </ThemedText>
              )}
              <FlatList
                data={pickableCalendars}
                keyExtractor={(c) => c.id}
                style={styles.calendarList}
                ListHeaderComponent={
                  <Pressable style={styles.calendarOption} onPress={handleUseDefaultCalendar}>
                    <ThemedText type="small">Default (auto-pick)</ThemedText>
                  </Pressable>
                }
                ListEmptyComponent={
                  !isLoadingCalendars && !pickerError ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      No other calendars found on this device.
                    </ThemedText>
                  ) : null
                }
                renderItem={({ item }) => (
                  <Pressable style={styles.calendarOption} onPress={() => handleSelectCalendar(item)}>
                    <ThemedText type="small">{item.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.sourceName}
                    </ThemedText>
                  </Pressable>
                )}
              />
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  list: { padding: Spacing.three, gap: Spacing.three },
  empty: { textAlign: 'center', marginTop: Spacing.six },
  flexShrink: { flexShrink: 1 },
  actionButton: { alignSelf: 'flex-start', marginTop: Spacing.one },
  errorText: { color: '#dc2626' },
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
  calendarLabel: { flexShrink: 1 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: { maxHeight: '70%' },
  modalContent: {
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  calendarList: { maxHeight: 320 },
  calendarOption: { paddingVertical: Spacing.two, gap: 2 },
});
