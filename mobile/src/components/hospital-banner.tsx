import { StyleSheet } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** Top banner showing the hospital/unit context plus the signed-in person's
 * own name and position — useful on a shared device, or so anyone glancing
 * at the screen (or the person themself) can confirm who's logged in and
 * what they do. Shown for every account type, not just workers. */
export function HospitalBanner() {
  const { user } = useAuth();
  if (!user?.hospitalName) return null;

  const unitNames = user.units?.map((u) => u.name).join(', ');
  const position = [user.title, user.jobType?.name].filter(Boolean).join(' · ');

  return (
    <ThemedView style={styles.banner}>
      <ThemedView style={styles.row}>
        <ThemedText type="smallBold" style={styles.hospitalText}>
          {user.hospitalName}
        </ThemedText>
        {unitNames ? (
          <ThemedText type="small" style={styles.unitText}>
            {unitNames}
          </ThemedText>
        ) : null}
      </ThemedView>
      <ThemedView style={styles.row}>
        <ThemedText type="small" style={styles.nameText}>
          {user.firstName} {user.lastName}
        </ThemedText>
        {position ? (
          <ThemedText type="small" style={styles.unitText}>
            {position}
          </ThemedText>
        ) : null}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#0f172a',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 2,
  },
  row: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  hospitalText: { color: '#fff' },
  nameText: { color: '#e2e8f0' },
  unitText: { color: '#94a3b8' },
});
