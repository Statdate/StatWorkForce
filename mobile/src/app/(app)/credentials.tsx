import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { getCredentials, uploadCredentialFile, getCredentialFileDataUri, type Credential } from '@/lib/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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

export default function CredentialsScreen() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<{ id: string; message: string } | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<{ id: string; message: string } | null>(null);

  const load = useCallback(async () => {
    const { credentials } = await getCredentials();
    setCredentials(credentials);
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
          ListEmptyComponent={
            !isLoading ? (
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
                      style={styles.previewButton}>
                      <ThemedText type="small" style={styles.previewText}>
                        {isPreviewing ? 'Opening…' : 'Preview'}
                      </ThemedText>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => handleUpload(item.id)}
                    disabled={isUploading}
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
});
