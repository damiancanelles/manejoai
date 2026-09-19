import { Fragment, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../i18n';
import { openAssistantLink } from '../lib/assistantLinks';
import { colors, spacing, tones } from '../theme';

type ActionStatus = 'pending' | 'approving' | 'approved' | 'rejected' | 'error';

interface UIAction {
  id: string;
  type: string;
  summary: string;
  params: Record<string, unknown>;
  status: ActionStatus;
  link?: string;
  error?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: UIAction[];
}

const LINK_RE = /\[([^\]]+)\]\((\/[^\s)]+)\)/g;

function ChatText({ text, onLinkPress, tone }: { text: string; onLinkPress: (path: string) => void; tone: 'user' | 'assistant' }) {
  const parts: (string | { label: string; href: string })[] = [];
  let lastIndex = 0;
  for (const m of text.matchAll(LINK_RE)) {
    if (m.index! > lastIndex) parts.push(text.slice(lastIndex, m.index));
    parts.push({ label: m[1], href: m[2] });
    lastIndex = m.index! + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return (
    <Text style={tone === 'user' ? styles.userBodyText : styles.assistantBodyText}>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          <Fragment key={i}>{part}</Fragment>
        ) : (
          <Text key={i} style={styles.link} onPress={() => onLinkPress(part.href)}>
            {part.label}
          </Text>
        ),
      )}
    </Text>
  );
}

/**
 * The Assistant tab - a full screen instead of web's corner bubble, since
 * mobile already dedicates a tab to it. Same contract as AssistantWidget:
 * POST /assistant/message runs the tool-use loop and returns proposed
 * actions; nothing changes data until POST /assistant/actions/execute runs
 * after the user taps Approve. History is in-memory only, same as web.
 */
export default function AssistantScreen() {
  const navigation = useNavigation<any>();
  const { business } = useAuth();
  const t = useT();
  const isPro = business?.subscriptionTier === 'pro';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  function handleLink(path: string) {
    openAssistantLink(navigation, path);
  }

  async function onSend() {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const res = await api.post<{
        reply: string;
        actions: { id: string; type: string; summary: string; params: Record<string, unknown> }[];
      }>('/assistant/message', { messages: next.map(({ role, content }) => ({ role, content })) });
      const actions: UIAction[] = (res.actions ?? []).map((a) => ({ ...a, status: 'pending' }));
      setMessages([...next, { role: 'assistant', content: res.reply, actions: actions.length ? actions : undefined }]);
    } catch (err: any) {
      setError(err.message || t('assistant.error'));
    } finally {
      setSending(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }

  function patchAction(actionId: string, patch: Partial<UIAction>) {
    setMessages((prev) =>
      prev.map((m) =>
        m.actions?.some((a) => a.id === actionId)
          ? { ...m, actions: m.actions.map((a) => (a.id === actionId ? { ...a, ...patch } : a)) }
          : m,
      ),
    );
  }

  async function approveAction(action: UIAction) {
    patchAction(action.id, { status: 'approving', error: undefined });
    try {
      const res = await api.post<{ ok: boolean; link?: string }>('/assistant/actions/execute', {
        type: action.type,
        params: action.params,
      });
      patchAction(action.id, { status: 'approved', link: res.link });
    } catch (err: any) {
      patchAction(action.id, { status: 'error', error: err.message || t('assistant.actionFailed') });
    }
  }

  function rejectAction(action: UIAction) {
    patchAction(action.id, { status: 'rejected' });
  }

  if (!isPro) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.upsell}>
          <Text style={styles.upsellText}>{t('assistant.upsell', { pro: t('assistant.proWord') })}</Text>
          <Pressable
            onPress={() => navigation.navigate('More', { screen: 'Billing' })}
            style={styles.upgradeBtn}
          >
            <Text style={styles.upgradeBtnText}>{t('assistant.upgradeCta')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{t('assistant.header')}</Text>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.messages}>
          {messages.length === 0 && <Text style={styles.emptyText}>{t('assistant.placeholderExamples')}</Text>}
          {messages.map((m, i) => (
            <View key={i} style={[styles.messageRow, m.role === 'user' ? styles.rowEnd : styles.rowStart]}>
              <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                <ChatText text={m.content} onLinkPress={handleLink} tone={m.role} />
              </View>
              {m.actions?.map((a) => (
                <ActionCardWithLink key={a.id} action={a} onApprove={() => approveAction(a)} onReject={() => rejectAction(a)} onLink={handleLink} />
              ))}
            </View>
          ))}
          {sending && <Text style={styles.emptyText}>{t('assistant.thinking')}</Text>}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('assistant.inputPlaceholder')}
            placeholderTextColor={colors.textMuted}
            editable={!sending}
            style={styles.input}
            multiline
          />
          <Pressable onPress={onSend} disabled={sending || !input.trim()} style={[styles.sendBtn, (sending || !input.trim()) && styles.sendBtnDisabled]}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendBtnText}>{t('assistant.send')}</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ActionCardWithLink({
  action,
  onApprove,
  onReject,
  onLink,
}: {
  action: UIAction;
  onApprove: () => void;
  onReject: () => void;
  onLink: (path: string) => void;
}) {
  const t = useT();
  return (
    <View style={styles.actionCard}>
      <Text style={styles.actionSummary}>{action.summary}</Text>
      {action.status === 'pending' && (
        <View style={styles.actionButtons}>
          <Pressable onPress={onApprove} style={styles.approveBtn}>
            <Text style={styles.approveBtnText}>{t('assistant.approve')}</Text>
          </Pressable>
          <Pressable onPress={onReject} style={styles.rejectBtn}>
            <Text style={styles.rejectBtnText}>{t('assistant.reject')}</Text>
          </Pressable>
        </View>
      )}
      {action.status === 'approving' && <Text style={styles.actionMuted}>{t('assistant.approving')}</Text>}
      {action.status === 'approved' && (
        <View style={styles.actionButtons}>
          <Text style={styles.actionApproved}>✓ {t('assistant.approved')}</Text>
          {action.link && (
            <Text style={styles.link} onPress={() => onLink(action.link!)}>
              {t('assistant.viewResult')}
            </Text>
          )}
        </View>
      )}
      {action.status === 'rejected' && <Text style={styles.actionMuted}>{t('assistant.rejected')}</Text>}
      {action.status === 'error' && (
        <View style={{ gap: spacing.xs }}>
          <Text style={styles.actionError}>{action.error || t('assistant.actionFailed')}</Text>
          <Pressable onPress={onApprove} style={styles.rejectBtn}>
            <Text style={styles.rejectBtnText}>{t('assistant.retry')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  headerText: { fontSize: 15, fontWeight: '700', color: colors.text },
  messages: { padding: spacing.md, gap: spacing.sm },
  emptyText: { fontSize: 13, color: colors.textMuted },
  errorText: { fontSize: 13, color: colors.danger },
  messageRow: { gap: spacing.xs, maxWidth: '92%' },
  rowStart: { alignSelf: 'flex-start' },
  rowEnd: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 12, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  userBubble: { backgroundColor: colors.accent },
  assistantBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  userBodyText: { fontSize: 14, color: '#fff' },
  assistantBodyText: { fontSize: 14, color: colors.text },
  link: { color: colors.accent, fontWeight: '600', textDecorationLine: 'underline' },
  actionCard: { backgroundColor: tones.warning.bg, borderRadius: 10, padding: spacing.sm, gap: spacing.xs },
  actionSummary: { fontSize: 13, color: colors.text },
  actionButtons: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  approveBtn: { backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  approveBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  rejectBtn: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  rejectBtnText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  actionMuted: { fontSize: 12, color: colors.textMuted },
  actionApproved: { fontSize: 12, color: tones.success.fg, fontWeight: '600' },
  actionError: { fontSize: 12, color: colors.danger },
  inputRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, alignItems: 'flex-end' },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 8, fontSize: 14, color: colors.text, maxHeight: 100 },
  sendBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  upsell: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  upsellText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  upgradeBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  upgradeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
