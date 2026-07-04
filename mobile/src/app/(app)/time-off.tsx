import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getTimeOffRequests,
  requestTimeOff,
  withdrawTimeOffRequest,
  TIME_OFF_HOURS_OPTIONS,
  ApiError,
  type TimeOffRequest,
  type TimeOffRequestType,
} from '@/lib/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const TYPE_OPTIONS: { value: TimeOffRequestType; label: string }[] = [
  { value: 'SICK', label: 'Sick' },
  { value: 'VACATION', label: 'Vacation' },
  { value: 'LIFE_BALANCE', label: 'Life Balance' },
];

function statusStyle(status: TimeOffRequest['status']) {
  if (status === 'APPROVED') return { label: 'Approved', color: '#059669' };
  if (status === 'DENIED') return { label: 'Denied', color: '#dc2626' };
  return { label: 'Pending', color: '#d97706' };
}

export default function TimeOffScreen() {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [type, setType] = useState<TimeOffRequestType>('VACATION');
  const [hours, setHours] = useState(8);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { requests } = await getTimeOffRequests();
      setRequests(requests);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Could not load your time off requests.');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  async function onRefresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  async function handleSubmit() {
    setFormError(null);
    setIsSubmitting(true);
    try {
      await requestTimeOff(type, startDate, endDate, hours, reason || undefined);
      setStartDate('');
      setEndDate('');
      setReason('');
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Request failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleWithdraw(requestId: string) {
    setWithdrawingId(requestId);
    setWithdrawError(null);
    try {
      await withdrawTimeOffRequest(requestId);
      await load();
    } catch (error) {
      setWithdrawError(error instanceof ApiError ? error.message : 'Could not withdraw the request.');
    } finally {
      setWithdrawingId(null);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <>
              {(loadError || withdrawError) && (
                <ThemedView type="backgroundElement" style={styles.errorCard}>
                  <ThemedText style={styles.errorText}>{loadError ?? withdrawError}</ThemedText>
                  {loadError && (
                    <Pressable onPress={load} style={styles.actionButton}>
                      <ThemedText type="small" style={styles.retryText}>
                        Retry
                      </ThemedText>
                    </Pressable>
                  )}
                </ThemedView>
              )}
              <ThemedView type="backgroundElement" style={styles.formCard}>
              <ThemedText type="smallBold">Request time off</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Need a shift released? Request time off instead of cancelling it yourself.
              </ThemedText>

              <ThemedView style={styles.typeRow}>
                {TYPE_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setType(option.value)}
                    style={[styles.typeChip, type === option.value && styles.typeChipActive]}>
                    <ThemedText
                      type="small"
                      style={type === option.value ? styles.typeChipTextActive : undefined}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </ThemedView>

              <ThemedText type="small">Hours requested</ThemedText>
              <ThemedView style={styles.typeRow}>
                {TIME_OFF_HOURS_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setHours(option)}
                    style={[styles.typeChip, hours === option && styles.typeChipActive]}>
                    <ThemedText
                      type="small"
                      style={hours === option ? styles.typeChipTextActive : undefined}>
                      {option}h
                    </ThemedText>
                  </Pressable>
                ))}
              </ThemedView>

              <ThemedText type="small">Start date (YYYY-MM-DD)</ThemedText>
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="2026-07-04"
                style={styles.input}
              />
              <ThemedText type="small">End date (YYYY-MM-DD)</ThemedText>
              <TextInput
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2026-07-04"
                style={styles.input}
              />
              <ThemedText type="small">Reason (optional)</ThemedText>
              <TextInput value={reason} onChangeText={setReason} style={styles.input} />

              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting || !startDate || !endDate}
                style={styles.submitButton}>
                <ThemedText type="small" style={styles.submitText}>
                  {isSubmitting ? 'Submitting…' : 'Submit request'}
                </ThemedText>
              </Pressable>
              {formError && (
                <ThemedText type="small" style={styles.errorText}>
                  {formError}
                </ThemedText>
              )}
              </ThemedView>
            </>
          }
          ListEmptyComponent={
            !isLoading && !loadError ? (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                No time off requests yet.
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => {
            const status = statusStyle(item.status);
            const typeLabel = TYPE_OPTIONS.find((o) => o.value === item.type)?.label ?? item.type;
            return (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">{typeLabel}</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {new Date(item.startDate).toLocaleDateString()} –{' '}
                  {new Date(item.endDate).toLocaleDateString()} · {item.hours} hours
                </ThemedText>
                {item.reason && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.reason}
                  </ThemedText>
                )}
                <ThemedText type="small" style={{ color: status.color }}>
                  {status.label}
                </ThemedText>
                {item.status === 'PENDING' && (
                  <Pressable
                    onPress={() => handleWithdraw(item.id)}
                    disabled={withdrawingId === item.id}
                    style={styles.actionButton}>
                    <ThemedText type="small" style={styles.errorText}>
                      {withdrawingId === item.id ? 'Withdrawing…' : 'Withdraw'}
                    </ThemedText>
                  </Pressable>
                )}
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
  actionButton: { alignSelf: 'flex-start', marginTop: Spacing.one },
  errorText: { color: '#dc2626' },
  errorCard: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.one, marginBottom: Spacing.two },
  retryText: { color: '#0f172a', fontWeight: '600', textDecorationLine: 'underline' },
  formCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  typeRow: { flexDirection: 'row', gap: Spacing.one, flexWrap: 'wrap', marginVertical: Spacing.one },
  typeChip: {
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
  },
  typeChipActive: { backgroundColor: '#0f172a' },
  typeChipTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#fff',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 8,
    marginBottom: Spacing.one,
  },
  submitButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
    backgroundColor: '#0f172a',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  submitText: { color: '#fff', fontWeight: '600' },
});
