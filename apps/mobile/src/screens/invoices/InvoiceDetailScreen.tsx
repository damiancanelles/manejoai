import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import Badge from '../../components/Badge';
import DetailField, { DetailCard } from '../../components/DetailField';
import EditableLineItems from '../../components/EditableLineItems';
import SelectField from '../../components/SelectField';
import { statusTone } from '../../lib/statusTone';
import { colors, spacing } from '../../theme';
import type { InvoicesStackParamList } from '../../navigation/types';

interface Reminder {
  id: string;
  sentAt: string;
  toEmail: string;
}
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}
interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  status: string;
  issueDate: string;
  dueDate: string;
  title: string;
  account: { id: string; name: string };
  property?: { id: string; name: string } | null;
  job?: { id: string; title: string } | null;
  items: InvoiceItem[];
  reminders: Reminder[];
}
interface AccountOption {
  id: string;
  name: string;
}
interface AccountDetail {
  id: string;
  properties: { id: string; name: string }[];
  jobs: { id: string; title: string }[];
}

export default function InvoiceDetailScreen() {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<InvoicesStackParamList, 'InvoiceDetail'>>();
  const { invoiceId, invoiceNumber } = route.params;
  const queryClient = useQueryClient();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingAssignment, setEditingAssignment] = useState(false);
  const [assignAccountId, setAssignAccountId] = useState('');
  const [assignPropertyId, setAssignPropertyId] = useState('');
  const [assignJobId, setAssignJobId] = useState('');

  useLayoutEffect(() => {
    if (invoiceNumber) navigation.setOptions({ title: invoiceNumber });
  }, [invoiceNumber, navigation]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['invoices', invoiceId],
    queryFn: () => api.get<InvoiceDetail>(`/invoices/${invoiceId}`),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  }

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', 'picker'],
    queryFn: () => api.get<AccountOption[]>('/accounts'),
    enabled: editingAssignment,
  });
  const { data: assignAccount } = useQuery({
    queryKey: ['accounts', assignAccountId],
    queryFn: () => api.get<AccountDetail>(`/accounts/${assignAccountId}`),
    enabled: editingAssignment && !!assignAccountId,
  });
  const saveAssignment = useMutation({
    mutationFn: () =>
      api.patch(`/invoices/${invoiceId}`, {
        accountId: assignAccountId,
        propertyId: assignPropertyId || null,
        jobId: assignJobId || null,
      }),
    onSuccess: () => {
      invalidate();
      setEditingAssignment(false);
    },
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  const addItem = useMutation({
    mutationFn: (row: { description: string; quantity: number; unitPriceCents: number }) => api.post<void>(`/invoices/${invoiceId}/items`, row),
    onSuccess: invalidate,
  });
  const updateItem = useMutation({
    mutationFn: ({ itemId, row }: { itemId: string; row: { description: string; quantity: number; unitPriceCents: number } }) =>
      api.patch<void>(`/invoices/${invoiceId}/items/${itemId}`, row),
    onSuccess: invalidate,
  });
  const removeItem = useMutation({
    mutationFn: (itemId: string) => api.delete<void>(`/invoices/${invoiceId}/items/${itemId}`),
    onSuccess: invalidate,
  });
  const saveTitle = useMutation({
    mutationFn: (title: string) => api.patch(`/invoices/${invoiceId}`, { title }),
    onSuccess: () => {
      invalidate();
      setEditingTitle(false);
    },
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });
  const action = useMutation({
    mutationFn: (path: 'mark-sent' | 'mark-paid' | 'cancel') => api.post(`/invoices/${invoiceId}/${path}`),
    onSuccess: invalidate,
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  if (isLoading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{(error as Error)?.message ?? 'Not found'}</Text>
      </View>
    );
  }

  const locked = data.status === 'PAID' || data.status === 'CANCELED';

  function startEditAssignment() {
    setAssignAccountId(data!.account.id);
    setAssignPropertyId(data!.property?.id ?? '');
    setAssignJobId(data!.job?.id ?? '');
    setEditingAssignment(true);
  }

  function changeAssignAccount(newAccountId: string) {
    setAssignAccountId(newAccountId);
    // Switching customers - the old property/job almost certainly don't
    // belong to the new one, so don't leave a stale selection showing.
    if (newAccountId !== data!.account.id) {
      setAssignPropertyId('');
      setAssignJobId('');
    } else {
      setAssignPropertyId(data!.property?.id ?? '');
      setAssignJobId(data!.job?.id ?? '');
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{data.invoiceNumber}</Text>
        <Badge label={t(`status.${data.status}`)} tone={statusTone(data.status)} />
      </View>

      {editingAssignment ? (
        <View style={styles.assignEdit}>
          <SelectField
            label={t('invoiceNew.customer')}
            value={assignAccountId}
            onChange={changeAssignAccount}
            placeholder={t('invoiceNew.selectCustomer')}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          />
          {assignAccount && assignAccount.properties.length > 0 && (
            <SelectField
              label={t('invoiceNew.property')}
              value={assignPropertyId}
              onChange={setAssignPropertyId}
              placeholder={t('common.none')}
              options={assignAccount.properties.map((p) => ({ value: p.id, label: p.name }))}
            />
          )}
          {assignAccount && assignAccount.jobs.length > 0 && (
            <SelectField
              label={t('invoiceNew.relatedJob')}
              value={assignJobId}
              onChange={setAssignJobId}
              placeholder={t('common.none')}
              options={assignAccount.jobs.map((j) => ({ value: j.id, label: j.title }))}
            />
          )}
          <View style={styles.titleEditRow}>
            <Pressable onPress={() => saveAssignment.mutate()} disabled={saveAssignment.isPending}>
              <Text style={styles.saveText}>{t('common.save')}</Text>
            </Pressable>
            <Pressable onPress={() => setEditingAssignment(false)} disabled={saveAssignment.isPending}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={styles.subtitle}>
          {data.account.name}
          {data.property ? ` · ${data.property.name}` : ''}
          {!locked && (
            <Text style={styles.editText} onPress={startEditAssignment}>
              {'  '}{t('common.edit')}
            </Text>
          )}
        </Text>
      )}

      <DetailCard>
        <DetailField label={t('invoiceDetail.issued')} value={new Date(data.issueDate).toLocaleDateString(locale)} />
        <DetailField label={t('invoiceDetail.due')} value={new Date(data.dueDate).toLocaleDateString(locale)} />
        {data.job && <DetailField label={t('invoiceDetail.job')} value={data.job.title} />}
        <View style={styles.titleRow}>
          <Text style={styles.titleLabel}>{t('invoiceDetail.titleLabel')}</Text>
          {editingTitle ? (
            <View style={styles.titleEditRow}>
              <TextInput value={titleDraft} onChangeText={setTitleDraft} style={styles.titleInput} autoFocus />
              <Pressable onPress={() => titleDraft.trim() && saveTitle.mutate(titleDraft.trim())} disabled={saveTitle.isPending}>
                <Text style={styles.saveText}>{t('common.save')}</Text>
              </Pressable>
              <Pressable onPress={() => setEditingTitle(false)} disabled={saveTitle.isPending}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.titleValue}>
              {data.title}
              {data.status === 'DRAFT' && (
                <Text
                  style={styles.editText}
                  onPress={() => {
                    setTitleDraft(data.title);
                    setEditingTitle(true);
                  }}
                >
                  {'  '}{t('common.edit')}
                </Text>
              )}
            </Text>
          )}
        </View>
      </DetailCard>

      <Text style={styles.sectionTitle}>{t('invoiceDetail.items')}</Text>
      <EditableLineItems
        items={data.items}
        totalCents={data.amountCents}
        totalLabel={t('lineItems.total')}
        locked={locked}
        onAdd={(row) => addItem.mutateAsync(row)}
        onUpdate={(itemId, row) => updateItem.mutateAsync({ itemId, row })}
        onRemove={(itemId) => removeItem.mutateAsync(itemId)}
      />

      <View style={styles.actions}>
        {data.status === 'DRAFT' && (
          <Pressable onPress={() => action.mutate('mark-sent')} disabled={action.isPending} style={[styles.sentBtn, action.isPending && styles.btnDisabled]}>
            <Text style={styles.sentBtnText}>{t('invoiceDetail.markSent')}</Text>
          </Pressable>
        )}
        {!locked && (
          <>
            <Pressable onPress={() => action.mutate('mark-paid')} disabled={action.isPending} style={[styles.paidBtn, action.isPending && styles.btnDisabled]}>
              <Text style={styles.paidBtnText}>{t('invoiceDetail.markPaid')}</Text>
            </Pressable>
            <Pressable onPress={() => action.mutate('cancel')} disabled={action.isPending} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>{t('invoiceDetail.cancelInvoice')}</Text>
            </Pressable>
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>{t('invoiceDetail.reminderHistory')}</Text>
      {data.reminders.length === 0 ? (
        <Text style={styles.empty}>{t('invoiceDetail.noReminders')}</Text>
      ) : (
        <DetailCard>
          {data.reminders.map((r) => (
            <DetailField key={r.id} label={r.toEmail} value={new Date(r.sentAt).toLocaleDateString(locale)} />
          ))}
        </DetailCard>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.danger },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: -8 },
  assignEdit: { gap: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  empty: { fontSize: 13, color: colors.textMuted },
  titleRow: { gap: 2, paddingTop: spacing.xs, marginTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  titleLabel: { fontSize: 13, color: colors.textMuted },
  titleValue: { fontSize: 14, color: colors.text },
  editText: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  titleEditRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 6, fontSize: 14, color: colors.text },
  saveText: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  cancelText: { fontSize: 13, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  sentBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 12, paddingHorizontal: spacing.md, alignItems: 'center' },
  sentBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  paidBtn: { backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 12, paddingHorizontal: spacing.md, alignItems: 'center' },
  paidBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cancelBtn: { backgroundColor: colors.border, borderRadius: 8, paddingVertical: 12, paddingHorizontal: spacing.md, alignItems: 'center' },
  cancelBtnText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
});
