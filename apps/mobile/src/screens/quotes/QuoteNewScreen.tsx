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
import type { QuotesStackParamList } from '../../navigation/types';

interface AccountOption {
  id: string;
  name: string;
}
interface AccountDetail {
  id: string;
  properties: { id: string; name: string }[];
  jobs: { id: string; title: string }[];
}

export default function QuoteNewScreen() {
  const t = useT();
  const navigation = useNavigation<NavigationProp<QuotesStackParamList>>();
  const queryClient = useQueryClient();

  const [accountId, setAccountId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [jobId, setJobId] = useState('');
  const [notes, setNotes] = useState('');
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

  const createQuote = useMutation({
    mutationFn: () => {
      const parsedItems = items.map((row) => ({
        description: row.description.trim(),
        quantity: Number(row.quantity),
        unitPriceCents: Math.round((Number(row.unitPrice) || 0) * 100),
      }));
      if (parsedItems.some((it) => !it.description)) throw new Error(t('lineItems.errDescription'));
      if (parsedItems.some((it) => !it.quantity || it.quantity < 1)) throw new Error(t('lineItems.errQuantity'));
      return api.post<{ id: string }>('/quotes', {
        accountId,
        propertyId: propertyId || undefined,
        jobId: jobId || undefined,
        items: parsedItems,
        notes: notes || undefined,
      });
    },
    onSuccess: (quote) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      navigation.navigate('QuoteDetail', { quoteId: quote.id });
    },
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  const canSubmit = !!accountId && !createQuote.isPending;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SelectField
        label={t('quoteNew.customer')}
        value={accountId}
        onChange={(v) => {
          setAccountId(v);
          setPropertyId('');
          setJobId('');
        }}
        placeholder={t('quoteNew.selectCustomer')}
        options={accounts.map((a) => ({ value: a.id, label: a.name }))}
      />

      {selectedAccount && selectedAccount.properties.length > 0 && (
        <SelectField
          label={t('quoteNew.property')}
          value={propertyId}
          onChange={setPropertyId}
          placeholder={t('common.none')}
          options={selectedAccount.properties.map((p) => ({ value: p.id, label: p.name }))}
        />
      )}

      {selectedAccount && selectedAccount.jobs.length > 0 && (
        <SelectField
          label={t('quoteNew.relatedJob')}
          value={jobId}
          onChange={setJobId}
          placeholder={t('common.none')}
          options={selectedAccount.jobs.map((j) => ({ value: j.id, label: j.title }))}
        />
      )}

      <LineItemEditor items={items} onChange={setItems} />

      <TextField label={t('quoteNew.notes')} value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

      <Pressable onPress={() => createQuote.mutate()} disabled={!canSubmit} style={[styles.submit, !canSubmit && styles.submitDisabled]}>
        <Text style={styles.submitText}>{createQuote.isPending ? t('common.saving') : t('quoteNew.submit')}</Text>
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
