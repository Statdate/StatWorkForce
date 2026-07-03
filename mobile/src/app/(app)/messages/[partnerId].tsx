import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { getConversation, sendMessage, type Message } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function ConversationScreen() {
  const { partnerId, name } = useLocalSearchParams<{ partnerId: string; name?: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    const { messages } = await getConversation(partnerId);
    setMessages(messages);
  }, [partnerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || isSending) return;
    setIsSending(true);
    setDraft('');
    try {
      await sendMessage(partnerId, body);
      await load();
      listRef.current?.scrollToEnd({ animated: true });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: name ?? 'Conversation' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={90}>
        <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const isMine = item.senderId === user?.id;
              return (
                <ThemedView
                  style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <ThemedText style={isMine ? styles.bubbleTextMine : undefined}>
                    {item.body}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={[styles.timestamp, isMine ? styles.bubbleTextMine : undefined]}>
                    {new Date(item.sentAt).toLocaleString()}
                  </ThemedText>
                </ThemedView>
              );
            }}
          />
          <ThemedView type="backgroundElement" style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a message..."
              style={styles.input}
              multiline
            />
            <Pressable onPress={handleSend} disabled={isSending || !draft.trim()} style={styles.sendButton}>
              <ThemedText style={styles.sendText}>Send</ThemedText>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  list: { padding: Spacing.three, gap: Spacing.two },
  bubble: { borderRadius: Spacing.two, padding: Spacing.two, marginBottom: Spacing.two, maxWidth: '80%' },
  bubbleMine: { backgroundColor: '#0f172a', alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: '#e2e8f0', alignSelf: 'flex-start' },
  bubbleTextMine: { color: '#fff' },
  timestamp: { marginTop: 2, opacity: 0.7 },
  composer: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.two,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#0f172a',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  sendText: { color: '#fff', fontWeight: '600' },
});
