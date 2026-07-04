import { useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type CalendarShift = {
  id: string;
  startTime: string;
  endTime: string;
  unitName: string;
  highlightLabel?: string | null;
};

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Month-grid calendar for the mobile schedule screen — same date math as
 * the web version, just RN Views instead of a CSS grid. */
export function ScheduleCalendar({ shifts }: { shifts: CalendarShift[] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, CalendarShift[]>();
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

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedView style={styles.header}>
        <Pressable
          onPress={() => {
            setCursor(new Date(year, month - 1, 1));
            setSelectedKey(null);
          }}
          hitSlop={8}>
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
          hitSlop={8}>
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

      <ThemedView style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) return <ThemedView key={i} style={styles.cell} />;
          const key = dateKey(date);
          const dayShifts = shiftsByDay.get(key) ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          return (
            <Pressable
              key={key}
              onPress={() => setSelectedKey(dayShifts.length > 0 ? key : null)}
              style={[
                styles.cell,
                isToday && styles.cellToday,
                isSelected && styles.cellSelected,
              ]}>
              <ThemedText type="small" style={isToday ? styles.todayText : undefined}>
                {date.getDate()}
              </ThemedText>
              {dayShifts.length > 0 && <ThemedView style={styles.dot} />}
            </Pressable>
          );
        })}
      </ThemedView>

      {selectedShifts.length > 0 && (
        <ThemedView style={styles.detailSection}>
          {selectedShifts.map((shift) => (
            <ThemedView key={shift.id} style={styles.detailRow}>
              <ThemedView>
                <ThemedText type="small">{shift.unitName}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {new Date(shift.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} –{' '}
                  {new Date(shift.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </ThemedText>
              </ThemedView>
              {shift.highlightLabel && (
                <ThemedView style={styles.highlightBadge}>
                  <ThemedText type="small" style={styles.highlightText}>
                    {shift.highlightLabel}
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>
          ))}
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
  cellToday: { backgroundColor: '#fef3c7' },
  cellSelected: { backgroundColor: '#e2e8f0' },
  todayText: { color: '#b45309', fontWeight: '600' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#0f172a', marginTop: 2 },
  detailSection: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: Spacing.two,
    gap: Spacing.one,
    backgroundColor: 'transparent',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  highlightBadge: { backgroundColor: '#0f172a', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  highlightText: { color: '#fff' },
});
