import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** A calendar popup to pick a date, alongside the manual YYYY-MM-DD text
 * field — some workers will always prefer typing the date directly, so both
 * stay available at once rather than replacing one with the other. */
export function DateField({
  label,
  value,
  onChange,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <ThemedView style={styles.row}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="2026-07-04"
        accessibilityLabel={accessibilityLabel}
        style={styles.input}
      />
      {Platform.OS !== 'web' && (
        <Pressable
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Pick ${label} from calendar`}
          style={styles.calendarButton}>
          <ThemedText type="small" style={styles.calendarButtonText}>
            📅
          </ThemedText>
        </Pressable>
      )}
      {pickerOpen && (
        <DateTimePicker
          value={value ? new Date(`${value}T00:00:00`) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selectedDate) => {
            setPickerOpen(Platform.OS === 'ios');
            if (event.type === 'set' && selectedDate) onChange(dateKey(selectedDate));
            if (Platform.OS !== 'ios') setPickerOpen(false);
          }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, backgroundColor: 'transparent' },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: Spacing.one, paddingHorizontal: Spacing.two, paddingVertical: 8 },
  calendarButton: { paddingHorizontal: Spacing.two, paddingVertical: 8 },
  calendarButtonText: { fontSize: 18 },
});
