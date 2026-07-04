import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import {
  getCredentials,
  addCredential,
  uploadCredentialFile,
  getCredentialFileDataUri,
  getManagerCredentials,
  ApiError,
  CREDENTIAL_TYPE_OPTIONS,
  type Credential,
  type CredentialType,
  type ManagerCredential,
  type ManagerCredentialWorker,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DateField } from '@/components/date-field';
import { Spacing } from '@/constants/theme';

const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;

const PICKABLE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

function credentialStatus(expirationDate: string) {
  const expiresAt = new Date(expirationDate).getTime();
  const now = Date.now();
  if (expiresAt < now) return { label: 'Expired', color: '#dc2626' };
  if (expiresAt - now < TWO_MONTHS_MS) return { label: 'Expiring soon', color: '#d97706' };
  return { label: 'Current', color: '#059669' };
}

/** Managers (ADA/assistant ADA) don't hold their own clinical credentials
 * through this tab — they instead need to see which of their workers'
 * credentials are expiring, so the tab shows that overview instead. */
export default function CredentialsScreen() {
  const { user } = useAuth();
  const isWorker = user?.accountType === 'WORKER';
  return isWorker ? <WorkerCredentialsView /> : <ManagerCredentialExpirations />;
}

function WorkerCredentialsView() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<{ id: string; message: string } | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<{ id: string; message: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newType, setNewType] = useState<CredentialType | ''>('');
  const [newCustomName, setNewCustomName] = useState('');
  const [newIssuingBody, setNewIssuingBody] = useState('');
  const [newCredentialNumber, setNewCredentialNumber] = useState('');
  const [newExpirationDate, setNewExpirationDate] = useState('');
  const [newFile, setNewFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { credentials } = await getCredentials();
      setCredentials(credentials);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Could not load your credentials.');
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

  async function handleUpload(credentialId: string) {
    setUploadError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: PICKABLE_MIME_TYPES });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploadingId(credentialId);
    try {
      await uploadCredentialFile(credentialId, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
      });
      await load();
    } catch (error) {
      setUploadError({
        id: credentialId,
        message: error instanceof Error ? error.message : 'Upload failed.',
      });
    } finally {
      setUploadingId(null);
    }
  }

  async function handlePickNewFile() {
    const result = await DocumentPicker.getDocumentAsync({ type: PICKABLE_MIME_TYPES });
    if (result.canceled) return;
    const asset = result.assets[0];
    setNewFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' });
  }

  async function handleAddCredential() {
    if (!newType) return;
    setAddError(null);
    setIsAdding(true);
    try {
      await addCredential({
        type: newType,
        customName: newCustomName || undefined,
        issuingBody: newIssuingBody || undefined,
        credentialNumber: newCredentialNumber || undefined,
        expirationDate: newExpirationDate,
        file: newFile ?? undefined,
      });
      setNewType('');
      setNewCustomName('');
      setNewIssuingBody('');
      setNewCredentialNumber('');
      setNewExpirationDate('');
      setNewFile(null);
      await load();
    } catch (error) {
      setAddError(error instanceof ApiError ? error.message : 'Could not add credential.');
    } finally {
      setIsAdding(false);
    }
  }

  async function handlePreview(credentialId: string) {
    setPreviewError(null);
    setPreviewingId(credentialId);
    try {
      const dataUri = await getCredentialFileDataUri(credentialId);
      await WebBrowser.openBrowserAsync(dataUri);
    } catch (error) {
      setPreviewError({
        id: credentialId,
        message: error instanceof Error ? error.message : 'Could not open document.',
      });
    } finally {
      setPreviewingId(null);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <FlatList
          data={credentials}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <>
              {loadError && (
                <ThemedView type="backgroundElement" style={styles.errorCard}>
                  <ThemedText style={styles.errorText} accessibilityRole="alert">
                    {loadError}
                  </ThemedText>
                  <Pressable
                    onPress={load}
                    accessibilityRole="button"
                    accessibilityLabel="Retry"
                    style={styles.retryButton}>
                    <ThemedText type="small" style={styles.previewText}>
                      Retry
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              )}
              <ThemedView type="backgroundElement" style={styles.formCard}>
                <ThemedText type="smallBold">Add a credential</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Pick what you&apos;re adding, set its expiration date, and attach the document.
                </ThemedText>
                <ThemedView style={styles.typeRow}>
                  {CREDENTIAL_TYPE_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setNewType(option.value)}
                      accessibilityRole="radio"
                      accessibilityLabel={option.label}
                      accessibilityState={{ selected: newType === option.value }}
                      style={[styles.typeChip, newType === option.value && styles.typeChipActive]}>
                      <ThemedText
                        type="small"
                        style={newType === option.value ? styles.typeChipTextActive : undefined}>
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ThemedView>
                {newType === 'OTHER' && (
                  <TextInput
                    value={newCustomName}
                    onChangeText={setNewCustomName}
                    placeholder="Name the certification (required for Custom/Other)"
                    accessibilityLabel="Certification name, required for Custom/Other"
                    style={styles.input}
                  />
                )}
                <TextInput
                  value={newIssuingBody}
                  onChangeText={setNewIssuingBody}
                  placeholder="Issuing body (optional)"
                  accessibilityLabel="Issuing body, optional"
                  style={styles.input}
                />
                <TextInput
                  value={newCredentialNumber}
                  onChangeText={setNewCredentialNumber}
                  placeholder="Credential / license number (optional)"
                  accessibilityLabel="Credential number, optional"
                  style={styles.input}
                />
                <ThemedText type="small">Expiration date (pick or type YYYY-MM-DD)</ThemedText>
                <DateField
                  label="expiration date"
                  value={newExpirationDate}
                  onChange={setNewExpirationDate}
                  accessibilityLabel="Expiration date, year-month-day"
                />
                <Pressable
                  onPress={handlePickNewFile}
                  accessibilityRole="button"
                  accessibilityLabel={newFile ? `Document selected: ${newFile.name}` : 'Attach document, optional'}
                  style={styles.attachButton}>
                  <ThemedText type="small" style={styles.previewText}>
                    {newFile ? `Document: ${newFile.name}` : 'Attach document (optional)'}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleAddCredential}
                  disabled={isAdding || !newType || !newExpirationDate}
                  accessibilityRole="button"
                  accessibilityLabel="Add credential"
                  accessibilityState={{ disabled: isAdding || !newType || !newExpirationDate }}
                  style={styles.uploadButton}>
                  <ThemedText type="small" style={styles.uploadText}>
                    {isAdding ? 'Adding…' : 'Add credential'}
                  </ThemedText>
                </Pressable>
                {addError && (
                  <ThemedText type="small" style={styles.errorText} accessibilityRole="alert">
                    {addError}
                  </ThemedText>
                )}
              </ThemedView>
            </>
          }
          ListEmptyComponent={
            !isLoading && !loadError ? (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                No credentials on file yet.
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => {
            const status = credentialStatus(item.expirationDate);
            const isUploading = uploadingId === item.id;
            const isPreviewing = previewingId === item.id;
            return (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">
                  {item.customName ?? item.type.replaceAll('_', ' ')}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {item.issuingBody ?? 'Issuing body not set'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Expires {new Date(item.expirationDate).toLocaleDateString()}
                </ThemedText>
                <ThemedText type="small" style={{ color: status.color }}>
                  {status.label}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.fileName
                    ? `Document: ${item.fileName}${
                        item.fileUploadedAt
                          ? ` (uploaded ${new Date(item.fileUploadedAt).toLocaleDateString()})`
                          : ''
                      }`
                    : 'No document uploaded yet.'}
                </ThemedText>
                <ThemedView style={styles.buttonRow}>
                  {item.fileName && (
                    <Pressable
                      onPress={() => handlePreview(item.id)}
                      disabled={isPreviewing}
                      accessibilityRole="button"
                      accessibilityLabel={`Preview document for ${item.customName ?? item.type.replaceAll('_', ' ')}`}
                      accessibilityState={{ disabled: isPreviewing }}
                      style={styles.previewButton}>
                      <ThemedText type="small" style={styles.previewText}>
                        {isPreviewing ? 'Opening…' : 'Preview'}
                      </ThemedText>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => handleUpload(item.id)}
                    disabled={isUploading}
                    accessibilityRole="button"
                    accessibilityLabel={
                      item.fileName
                        ? `Replace document for ${item.customName ?? item.type.replaceAll('_', ' ')}`
                        : `Upload document for ${item.customName ?? item.type.replaceAll('_', ' ')}`
                    }
                    accessibilityState={{ disabled: isUploading }}
                    style={styles.uploadButton}>
                    <ThemedText type="small" style={styles.uploadText}>
                      {isUploading
                        ? 'Uploading…'
                        : item.fileName
                          ? 'Replace document'
                          : 'Upload document'}
                    </ThemedText>
                  </Pressable>
                </ThemedView>
                {uploadError?.id === item.id && (
                  <ThemedText type="small" style={styles.errorText}>
                    {uploadError.message}
                  </ThemedText>
                )}
                {previewError?.id === item.id && (
                  <ThemedText type="small" style={styles.errorText}>
                    {previewError.message}
                  </ThemedText>
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
  buttonRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  uploadButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#0f172a',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  uploadText: { color: '#fff', fontWeight: '600' },
  previewButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  previewText: { color: '#0f172a', fontWeight: '600' },
  errorText: { color: '#dc2626' },
  errorCard: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.one, marginBottom: Spacing.two },
  retryButton: { alignSelf: 'flex-start' },
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
  attachButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    marginBottom: Spacing.one,
  },
});

const CREDENTIAL_TYPE_LABELS = Object.fromEntries(
  CREDENTIAL_TYPE_OPTIONS.map((o) => [o.value, o.label])
) as Record<CredentialType, string>;

function ManagerCredentialExpirations() {
  const [credentials, setCredentials] = useState<ManagerCredential[]>([]);
  const [workersWithoutCredentials, setWorkersWithoutCredentials] = useState<ManagerCredentialWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { credentials, workersWithoutCredentials } = await getManagerCredentials();
      setCredentials(credentials);
      setWorkersWithoutCredentials(workersWithoutCredentials);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Could not load unit credentials.');
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <FlatList
          data={credentials}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <>
              {loadError && (
                <ThemedView type="backgroundElement" style={styles.errorCard}>
                  <ThemedText style={styles.errorText} accessibilityRole="alert">
                    {loadError}
                  </ThemedText>
                  <Pressable
                    onPress={load}
                    accessibilityRole="button"
                    accessibilityLabel="Retry"
                    style={styles.retryButton}>
                    <ThemedText type="small" style={styles.previewText}>
                      Retry
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              )}
              {workersWithoutCredentials.length > 0 && (
                <ThemedView type="backgroundElement" style={managerCredStyles.gapCard}>
                  <ThemedText type="smallBold">No credentials on file</ThemedText>
                  {workersWithoutCredentials.map((worker) => (
                    <ThemedText key={worker.id} themeColor="textSecondary">
                      {worker.firstName} {worker.lastName} · #{worker.badgeNumber}
                    </ThemedText>
                  ))}
                </ThemedView>
              )}
            </>
          }
          ListEmptyComponent={
            !isLoading && !loadError ? (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                No credentials on file for your units yet.
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => {
            const status = credentialStatus(item.expirationDate);
            return (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">
                  {item.user.firstName} {item.user.lastName}{' '}
                  <ThemedText type="small" themeColor="textSecondary">
                    #{item.user.badgeNumber}
                  </ThemedText>
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {item.customName ?? CREDENTIAL_TYPE_LABELS[item.type] ?? item.type.replaceAll('_', ' ')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Expires {new Date(item.expirationDate).toLocaleDateString()}
                </ThemedText>
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

const managerCredStyles = StyleSheet.create({
  gapCard: { borderRadius: Spacing.two, padding: Spacing.three, gap: 4, marginBottom: Spacing.three },
});
