import { useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  getUnitWorkers,
  offerShift,
  reviewShiftPickup,
  ApiError,
  type ManagerShift,
  type ManagerUnitWorker,
} from '@/lib/api';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Manager-only month calendar for the mobile Unit Schedule tab. Days are
 * color-coded by aggregate staffing (any understaffed shift that day makes
 * it red; a fully-covered day is green) — tapping a day expands per-shift
 * ratios, the list of workers who requested that shift (approve/deny), and
 * an "offer this shift to staff" picker. */
export function UnitScheduleCalendar({
  shifts,
  onRefresh,
}: {
  shifts: ManagerShift[];
  onRefresh: () => Promise<void>;
}) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [offeringShiftId, setOfferingShiftId] = useState<string | null>(null);
  const [workers, setWorkers] = useState<ManagerUnitWorker[]>([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, ManagerShift[]>();
    for (const shift of shifts) {
      const key = dateKey(new Date(shift.startTime));
      const list = map.get(key) ?? [];
      list.push(shift);
      map.set(key, list);
    }
    return map;
  }, [shifts]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;
  const todayKey = dateKey(new Date());

  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - leadingBlanks + 1;
    cells.push(dayNum >= 1 && dayNum <= daysInMonth ? new Date(year, month, dayNum) : null);
  }

  const selectedShifts = selectedKey ? (shiftsByDay.get(selectedKey) ?? []) : [];

  async function handleOpenOffer(shift: ManagerShift) {
    setOfferingShiftId(shift.id);
    setActionError(null);
    setWorkersLoading(true);
    try {
      const { workers } = await getUnitWorkers(shift.unitId);
      setWorkers(workers);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Could not load unit staff.');
      setOfferingShiftId(null);
    } finally {
      setWorkersLoading(false);
    }
  }

  async function handleOffer(workerId: string) {
    if (!offeringShiftId) return;
    setPendingAction(workerId);
    setActionError(null);
    try {
      await offerShift(offeringShiftId, workerId);
      setOfferingShiftId(null);
      await onRefresh();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Could not offer the shift.');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleReview(assignmentId: string, decision: 'APPROVED' | 'DENIED') {
    setPendingAction(assignmentId);
    setActionError(null);
    try {
      await reviewShiftPickup(assignmentId, decision);
      await onRefresh();
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Could not record that decision.');
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedView style={styles.header}>
        <Pressable
          onPress={() => {
            setCursor(new Date(year, month - 1, 1));
            setSelectedKey(null);
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month">
          <ThemedText type="smallBold">‹</ThemedText>
        </Pressable>
        <ThemedText type="smallBold">
          {firstOfMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </ThemedText>
        <Pressable
          onPress={() => {
            setCursor(new Date(year, month + 1, 1));
            setSelectedKey(null);
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next month">
          <ThemedText type="smallBold">›</ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <ThemedText key={i} type="small" themeColor="textSecondary" style={styles.weekday}>
            {label}
          </ThemedText>
        ))}
      </ThemedView>

      <ThemedView style={styles.legendRow}>
        <ThemedView style={styles.legendItem}>
          <ThemedView style={[styles.legendDot, styles.staffedFill]} />
          <ThemedText type="small" themeColor="textSecondary">
            Fully staffed
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.legendItem}>
          <ThemedView style={[styles.legendDot, styles.shortFill]} />
          <ThemedText type="small" themeColor="textSecondary">
            Short-staffed
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) return <ThemedView key={i} style={styles.cell} />;
          const key = dateKey(date);
          const dayShifts = shiftsByDay.get(key) ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const isShort = dayShifts.some((s) => s.isUnderstaffed);
          const isStaffed = dayShifts.length > 0 && !isShort;
          return (
            <Pressable
              key={key}
              onPress={() => setSelectedKey(dayShifts.length > 0 ? key : null)}
              accessibilityRole="button"
              accessibilityLabel={`${date.toLocaleDateString()}${
                dayShifts.length ? (isShort ? ', short-staffed' : ', fully staffed') : ''
              }`}
              style={[
                styles.cell,
                isStaffed && styles.staffedFill,
                isShort && styles.shortFill,
                isSelected && styles.cellSelected,
                isToday && styles.cellToday,
              ]}>
              <ThemedText type="small" style={isShort || isStaffed ? styles.onColorText : undefined}>
                {date.getDate()}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>

      {actionError && (
        <ThemedText type="small" style={styles.errorText} accessibilityRole="alert">
          {actionError}
        </ThemedText>
      )}

      {selectedShifts.length > 0 && (
        <ThemedView style={styles.detailSection}>
          {selectedShifts.map((shift) => {
            const requested = shift.assignments.filter((a) => a.status === 'SELF_SCHEDULED');
            const statusLabel = shift.isUnderstaffed
              ? 'Short-staffed'
              : shift.isOverstaffed
                ? 'Overstaffed'
                : 'Fully staffed';
            const statusStyle = shift.isUnderstaffed ? styles.shortBadge : styles.staffedBadge;

            return (
              <ThemedView key={shift.id} style={styles.shiftCard}>
                <ThemedView style={styles.shiftHeaderRow}>
                  <ThemedText type="smallBold">
                    {shift.unit.name} · {shift.jobType.name}
                  </ThemedText>
                  <ThemedView style={[styles.badge, statusStyle]}>
                    <ThemedText type="small" style={styles.badgeText}>
                      {statusLabel}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatTime(shift.startTime)} – {formatTime(shift.endTime)} · {shift.filledCount} /{' '}
                  {shift.requiredCount} filled
                </ThemedText>

                {requested.length > 0 && (
                  <ThemedView style={styles.requestersBlock}>
                    <ThemedText type="small" style={styles.blockTitle}>
                      Requested to work this shift
                    </ThemedText>
                    {requested.map((a) => (
                      <ThemedView key={a.id} style={styles.requesterRow}>
                        <ThemedText type="small">
                          {a.user.firstName} {a.user.lastName} · #{a.user.badgeNumber}
                        </ThemedText>
                        <ThemedView style={styles.requesterActions}>
                          <Pressable
                            onPress={() => handleReview(a.id, 'APPROVED')}
                            disabled={pendingAction === a.id}
                            accessibilityRole="button"
                            accessibilityLabel={`Approve ${a.user.firstName} ${a.user.lastName}`}
                            style={styles.approveButton}>
                            <ThemedText type="small" style={styles.approveText}>
                              {pendingAction === a.id ? '…' : 'Approve'}
                            </ThemedText>
                          </Pressable>
                          <Pressable
                            onPress={() => handleReview(a.id, 'DENIED')}
                            disabled={pendingAction === a.id}
                            accessibilityRole="button"
                            accessibilityLabel={`Deny ${a.user.firstName} ${a.user.lastName}`}
                            style={styles.denyButton}>
                            <ThemedText type="small" style={styles.denyText}>
                              Deny
                            </ThemedText>
                          </Pressable>
                        </ThemedView>
                      </ThemedView>
                    ))}
                  </ThemedView>
                )}

                {offeringShiftId === shift.id ? (
                  <ThemedView style={styles.offerPanel}>
                    <ThemedText type="small" style={styles.blockTitle}>
                      Offer this shift to
                    </ThemedText>
                    {workersLoading && (
                      <ThemedText type="small" themeColor="textSecondary">
                        Loading staff…
                      </ThemedText>
                    )}
                    {!workersLoading && workers.length === 0 && (
                      <ThemedText type="small" themeColor="textSecondary">
                        No workers found for this unit.
                      </ThemedText>
                    )}
                    {workers.map((w) => (
                      <Pressable
                        key={w.id}
                        onPress={() => handleOffer(w.id)}
                        disabled={pendingAction === w.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Offer shift to ${w.firstName} ${w.lastName}`}
                        style={styles.workerRow}>
                        <ThemedText type="small">
                          {w.firstName} {w.lastName} · #{w.badgeNumber}
                        </ThemedText>
                        <ThemedText type="small" style={styles.offerActionText}>
                          {pendingAction === w.id ? 'Offering…' : 'Offer'}
                        </ThemedText>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => setOfferingShiftId(null)}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel offer"
                      style={styles.cancelOfferButton}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Cancel
                      </ThemedText>
                    </Pressable>
                  </ThemedView>
                ) : (
                  <Pressable
                    onPress={() => handleOpenOffer(shift)}
                    accessibilityRole="button"
                    accessibilityLabel={`Offer shift to staff for ${shift.unit.name}`}
                    style={styles.offerButton}>
                    <ThemedText type="small" style={styles.offerButtonText}>
                      Offer shift to staff
                    </ThemedText>
                  </Pressable>
                )}
              </ThemedView>
            );
          })}
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two, marginBottom: Spacing.three },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  weekRow: { flexDirection: 'row', backgroundColor: 'transparent' },
  weekday: { flex: 1, textAlign: 'center' },
  legendRow: { flexDirection: 'row', gap: Spacing.three, backgroundColor: 'transparent' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'transparent' },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: 'transparent' },
  cell: {
    width: `${100 / 7}%`,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  staffedFill: { backgroundColor: '#059669' },
  shortFill: { backgroundColor: '#dc2626' },
  onColorText: { color: '#fff', fontWeight: '600' },
  cellSelected: { borderWidth: 2, borderColor: '#0f172a' },
  cellToday: { borderWidth: 2, borderColor: '#2563eb' },
  errorText: { color: '#dc2626' },
  detailSection: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: Spacing.two,
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  shiftCard: { borderRadius: Spacing.one, padding: Spacing.two, gap: 4, backgroundColor: '#ffffff14' },
  shiftHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  badge: { borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  staffedBadge: { backgroundColor: '#059669' },
  shortBadge: { backgroundColor: '#dc2626' },
  badgeText: { color: '#fff', fontWeight: '600' },
  blockTitle: { fontWeight: '600' },
  requestersBlock: { marginTop: Spacing.one, gap: Spacing.one, backgroundColor: 'transparent' },
  requesterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  requesterActions: { flexDirection: 'row', gap: Spacing.one, backgroundColor: 'transparent' },
  approveButton: {
    backgroundColor: '#0f172a',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  approveText: { color: '#fff', fontWeight: '600' },
  denyButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  denyText: { color: '#dc2626', fontWeight: '600' },
  offerPanel: { marginTop: Spacing.one, gap: Spacing.one, backgroundColor: 'transparent' },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  offerActionText: { color: '#0f172a', fontWeight: '600', textDecorationLine: 'underline' },
  cancelOfferButton: { alignSelf: 'flex-start', marginTop: 4 },
  offerButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  offerButtonText: { color: '#0f172a', fontWeight: '600' },
});
