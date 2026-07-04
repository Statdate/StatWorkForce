import { StyleSheet } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** Top banner showing which hospital/unit the signed-in worker belongs to —
 * useful context on a shared device or when a worker floats between units. */
export function HospitalBanner() {
  const { user } = useAuth();
  if (!user?.hospitalName) return null;

  const unitNames = user.units?.map((u) => u.name).join(', ');

  return (
    <ThemedView style={styles.banner}>
      <ThemedText type="smallBold" style={styles.hospitalText}>
        {user.hospitalName}
      </ThemedText>
      {unitNames && (
        <ThemedText type="small" style={styles.unitText}>
          {unitNames}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#0f172a',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  hospitalText: { color: '#fff' },
  unitText: { color: '#94a3b8' },
});
