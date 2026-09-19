import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { api } from '../../api/client';
import { useT } from '../../i18n';
import LineItemEditor, { emptyItemRow, type ItemRow } from '../../components/LineItemEditor';
import SelectField from '../../components/SelectField';
import TextField from '../../components/TextField';
import { colors, spacing } from '../../theme';
import type { InvoicesStackParamList } from '../../navigation/types';

interface AccountOption {
  id: string;
  name: string;
}
interface AccountDetail {
  id: string;
  properties: { id: string; name: string }[];
  jobs: { id: string; title: string }[];
}

// 30 days out, in local time - matches web's InvoiceNew (toISOString() would
// shift the date back a day for anyone west of UTC).
function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function InvoiceNewScreen() {
  const t = useT();
  const navigation = useNavigation<NavigationProp<InvoicesStackParamList>>();
  const queryClient = useQueryClient();

  const [accountId, setAccountId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [jobId, setJobId] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<ItemRow[]>([emptyItemRow()]);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', 'picker'],
    queryFn: () => api.get<AccountOption[]>('/accounts'),
  });

  const { data: selectedAccount } = useQuery({
    queryKey: ['accounts', accountId],
    queryFn: () => api.get<AccountDetail>(`/accounts/${accountId}`),
    enabled: !!accountId,
  });

  const createInvoice = useMutation({
    mutationFn: () => {
      const parsedItems = items.map((row) => ({
        description: row.description.trim(),
        quantity: Number(row.quantity),
        unitPriceCents: Math.round((Number(row.unitPrice) || 0) * 100),
      }));
      if (parsedItems.some((it) => !it.description)) throw new Error(t('lineItems.errDescription'));
      if (parsedItems.some((it) => !it.quantity || it.quantity < 1)) throw new Error(t('lineItems.errQuantity'));
      const parsedDue = new Date(dueDate);
      if (Number.isNaN(parsedDue.getTime())) throw new Error(t('invoiceNew.dueDate'));
      if (!title.trim()) throw new Error(t('invoiceNew.invoiceTitle'));
      return api.post<{ id: string }>('/invoices', {
        accountId,
        propertyId: propertyId || undefined,
        jobId: jobId || undefined,
        items: parsedItems,
        dueDate: parsedDue.toISOString(),
        title: title.trim(),
      });
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigation.navigate('InvoiceDetail', { invoiceId: invoice.id });
    },
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  const canSubmit = !!accountId && !!title.trim() && !createInvoice.isPending;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SelectField
        label={t('invoiceNew.customer')}
        value={accountId}
        onChange={(v) => {
          setAccountId(v);
          setPropertyId('');
          setJobId('');
        }}
        placeholder={t('invoiceNew.selectCustomer')}
        options={accounts.map((a) => ({ value: a.id, label: a.name }))}
      />

      {selectedAccount && selectedAccount.properties.length > 0 && (
        <SelectField
          label={t('invoiceNew.property')}
          value={propertyId}
          onChange={setPropertyId}
          placeholder={t('common.none')}
          options={selectedAccount.properties.map((p) => ({ value: p.id, label: p.name }))}
        />
      )}

      {selectedAccount && selectedAccount.jobs.length > 0 && (
        <SelectField
          label={t('invoiceNew.relatedJob')}
          value={jobId}
          onChange={setJobId}
          placeholder={t('common.none')}
          options={selectedAccount.jobs.map((j) => ({ value: j.id, label: j.title }))}
        />
      )}

      <LineItemEditor items={items} onChange={setItems} />

      <TextField label={`${t('invoiceNew.dueDate')} (YYYY-MM-DD)`} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />
      <TextField
        label={t('invoiceNew.invoiceTitle')}
        value={title}
        onChangeText={setTitle}
        placeholder={t('invoiceNew.invoiceTitlePlaceholder')}
      />

      <Pressable onPress={() => createInvoice.mutate()} disabled={!canSubmit} style={[styles.submit, !canSubmit && styles.submitDisabled]}>
        <Text style={styles.submitText}>{createInvoice.isPending ? t('common.saving') : t('invoiceNew.submit')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  submit: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 13, alignItems: 'center', marginTop: spacing.sm },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
