import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getTimeOffRequests,
  requestTimeOff,
  withdrawTimeOffRequest,
  getManagerTimeOffQueue,
  reviewTimeOffRequest,
  TIME_OFF_HOURS_OPTIONS,
  ApiError,
  type TimeOffRequest,
  type TimeOffRequestType,
  type ManagerTimeOffRequest,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DateField } from '@/components/date-field';
import { Spacing } from '@/constants/theme';

const TYPE_OPTIONS: { value: TimeOffRequestType; label: string }[] = [
  { value: 'SICK', label: 'Sick' },
  { value: 'VACATION', label: 'Vacation' },
  { value: 'LIFE_BALANCE', label: 'Life Balance' },
  { value: 'OTHER', label: 'Other' },
];

function statusStyle(status: TimeOffRequest['status']) {
  if (status === 'APPROVED') return { label: 'Approved', color: '#059669' };
  if (status === 'DENIED') return { label: 'Denied', color: '#dc2626' };
  return { label: 'Pending', color: '#d97706' };
}

/** Managers (ADA/assistant ADA) are salaried and don't submit time off
 * requests for themselves through this app — they instead approve/deny
 * their workers' requests, so the tab shows a queue instead of a form. */
export default function TimeOffScreen() {
  const { user } = useAuth();
  const isWorker = user?.accountType === 'WORKER';
  return isWorker ? <WorkerTimeOffView /> : <ManagerTimeOffQueue />;
}

function WorkerTimeOffView() {
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
                    accessibilityRole="radio"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected: type === option.value }}
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
                    accessibilityRole="radio"
                    accessibilityLabel={`${option} hours`}
                    accessibilityState={{ selected: hours === option }}
                    style={[styles.typeChip, hours === option && styles.typeChipActive]}>
                    <ThemedText
                      type="small"
                      style={hours === option ? styles.typeChipTextActive : undefined}>
                      {option}h
                    </ThemedText>
                  </Pressable>
                ))}
              </ThemedView>

              <ThemedText type="small">Start date (pick or type YYYY-MM-DD)</ThemedText>
              <DateField
                label="start date"
                value={startDate}
                onChange={setStartDate}
                accessibilityLabel="Start date, year-month-day"
              />
              <ThemedText type="small" style={styles.fieldSpacer}>
                End date (pick or type YYYY-MM-DD)
              </ThemedText>
              <DateField
                label="end date"
                value={endDate}
                onChange={setEndDate}
                accessibilityLabel="End date, year-month-day"
              />
              <ThemedText type="small" style={styles.fieldSpacer}>
                {type === 'OTHER' ? 'Comment (required for Other)' : 'Reason (optional)'}
              </ThemedText>
              <TextInput
                value={reason}
                onChangeText={setReason}
                multiline={type === 'OTHER'}
                numberOfLines={type === 'OTHER' ? 3 : 1}
                placeholder={type === 'OTHER' ? 'Describe the reason for this request…' : undefined}
                accessibilityLabel={type === 'OTHER' ? 'Comment, required' : 'Reason, optional'}
                style={styles.input}
              />

              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting || !startDate || !endDate || (type === 'OTHER' && !reason.trim())}
                accessibilityRole="button"
                accessibilityLabel="Submit request"
                accessibilityState={{
                  disabled: isSubmitting || !startDate || !endDate || (type === 'OTHER' && !reason.trim()),
                }}
                style={styles.submitButton}>
                <ThemedText type="small" style={styles.submitText}>
                  {isSubmitting ? 'Submitting…' : 'Submit request'}
                </ThemedText>
              </Pressable>
              {formError && (
                <ThemedText type="small" style={styles.errorText} accessibilityRole="alert">
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
                    accessibilityRole="button"
                    accessibilityLabel={`Withdraw ${typeLabel} request`}
                    accessibilityState={{ disabled: withdrawingId === item.id }}
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
  fieldSpacer: { marginTop: Spacing.one },
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

function ManagerTimeOffQueue() {
  const [requests, setRequests] = useState<ManagerTimeOffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [decideError, setDecideError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { requests } = await getManagerTimeOffQueue();
      setRequests(requests);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Could not load the approval queue.');
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

  async function handleDecision(requestId: string, decision: 'APPROVED' | 'DENIED') {
    setDecidingId(requestId);
    setDecideError(null);
    try {
      await reviewTimeOffRequest(requestId, decision);
      await load();
    } catch (error) {
      setDecideError(error instanceof ApiError ? error.message : 'Could not record that decision.');
    } finally {
      setDecidingId(null);
    }
  }

  const pending = requests.filter((r) => r.status === 'PENDING');
  const decided = requests.filter((r) => r.status !== 'PENDING');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <FlatList
          data={decided}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <>
              {(loadError || decideError) && (
                <ThemedView type="backgroundElement" style={styles.errorCard}>
                  <ThemedText style={styles.errorText} accessibilityRole="alert">
                    {loadError ?? decideError}
                  </ThemedText>
                  {loadError && (
                    <Pressable
                      onPress={load}
                      accessibilityRole="button"
                      accessibilityLabel="Retry"
                      style={styles.actionButton}>
                      <ThemedText type="small" style={styles.retryText}>
                        Retry
                      </ThemedText>
                    </Pressable>
                  )}
                </ThemedView>
              )}
              <ThemedText type="smallBold">Pending</ThemedText>
              <ThemedView style={managerStyles.pendingGroup}>
                {pending.map((request) => (
                  <ThemedView key={request.id} type="backgroundElement" style={styles.card}>
                    <ThemedText type="smallBold">
                      {request.user.firstName} {request.user.lastName}{' '}
                      <ThemedText type="small" themeColor="textSecondary">
                        #{request.user.badgeNumber}
                      </ThemedText>
                    </ThemedText>
                    <ThemedText themeColor="textSecondary">
                      {TYPE_LABELS[request.type]} · {new Date(request.startDate).toLocaleDateString()} –{' '}
                      {new Date(request.endDate).toLocaleDateString()} · {request.hours} hours
                    </ThemedText>
                    {request.reason && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {request.reason}
                      </ThemedText>
                    )}
                    <ThemedView style={managerStyles.buttonRow}>
                      <Pressable
                        onPress={() => handleDecision(request.id, 'APPROVED')}
                        disabled={decidingId === request.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Approve ${request.user.firstName} ${request.user.lastName}'s request`}
                        accessibilityState={{ disabled: decidingId === request.id }}
                        style={managerStyles.approveButton}>
                        <ThemedText type="small" style={managerStyles.approveText}>
                          {decidingId === request.id ? 'Saving…' : 'Approve'}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDecision(request.id, 'DENIED')}
                        disabled={decidingId === request.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Deny ${request.user.firstName} ${request.user.lastName}'s request`}
                        accessibilityState={{ disabled: decidingId === request.id }}
                        style={managerStyles.denyButton}>
                        <ThemedText type="small" style={managerStyles.denyText}>
                          Deny
                        </ThemedText>
                      </Pressable>
                    </ThemedView>
                  </ThemedView>
                ))}
                {pending.length === 0 && (
                  <ThemedText themeColor="textSecondary">No pending requests.</ThemedText>
                )}
              </ThemedView>
              {decided.length > 0 && <ThemedText type="smallBold">Reviewed</ThemedText>}
            </>
          }
          renderItem={({ item }) => {
            const status = timeOffStatusStyle(item.status);
            return (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">
                  {item.user.firstName} {item.user.lastName}{' '}
                  <ThemedText type="small" themeColor="textSecondary">
                    #{item.user.badgeNumber}
                  </ThemedText>
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {TYPE_LABELS[item.type]} · {new Date(item.startDate).toLocaleDateString()} –{' '}
                  {new Date(item.endDate).toLocaleDateString()}
                </ThemedText>
                {item.reviewedBy && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Reviewed by {item.reviewedBy.firstName} {item.reviewedBy.lastName}
                  </ThemedText>
                )}
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

const TYPE_LABELS: Record<TimeOffRequestType, string> = {
  SICK: 'Sick',
  VACATION: 'Vacation',
  LIFE_BALANCE: 'Life Balance',
  OTHER: 'Other',
};

function timeOffStatusStyle(status: TimeOffRequest['status']) {
  if (status === 'APPROVED') return { label: 'Approved', color: '#059669' };
  if (status === 'DENIED') return { label: 'Denied', color: '#dc2626' };
  return { label: 'Pending', color: '#d97706' };
}

const managerStyles = StyleSheet.create({
  pendingGroup: { gap: Spacing.two, marginTop: Spacing.two, marginBottom: Spacing.three },
  buttonRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  approveButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#0f172a',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  approveText: { color: '#fff', fontWeight: '600' },
  denyButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  denyText: { color: '#dc2626', fontWeight: '600' },
});
