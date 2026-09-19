import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { api } from '../../api/client';
import { useT } from '../../i18n';
import SelectField from '../../components/SelectField';
import TextField from '../../components/TextField';
import { colors, spacing } from '../../theme';
import type { JobsStackParamList } from '../../navigation/types';

interface AccountOption {
  id: string;
  name: string;
}
interface AccountDetail {
  id: string;
  properties: { id: string; name: string }[];
}

export default function JobNewScreen() {
  const t = useT();
  const navigation = useNavigation<NavigationProp<JobsStackParamList>>();
  const queryClient = useQueryClient();

  const [accountId, setAccountId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [description, setDescription] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', 'picker'],
    queryFn: () => api.get<AccountOption[]>('/accounts'),
  });

  const { data: selectedAccount } = useQuery({
    queryKey: ['accounts', accountId],
    queryFn: () => api.get<AccountDetail>(`/accounts/${accountId}`),
    enabled: !!accountId,
  });

  const createJob = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>('/jobs', {
        accountId,
        propertyId: propertyId || undefined,
        title: jobTitle,
        description: description || undefined,
      }),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      navigation.navigate('JobDetail', { jobId: job.id, title: jobTitle });
    },
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  const canSubmit = !!accountId && !!jobTitle.trim() && !createJob.isPending;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SelectField
        label={t('jobNew.customer')}
        value={accountId}
        onChange={(v) => {
          setAccountId(v);
          setPropertyId('');
        }}
        placeholder={t('jobNew.selectCustomer')}
        options={accounts.map((a) => ({ value: a.id, label: a.name }))}
      />

      {selectedAccount && selectedAccount.properties.length > 0 && (
        <SelectField
          label={t('jobNew.property')}
          value={propertyId}
          onChange={setPropertyId}
          placeholder={t('common.none')}
          options={selectedAccount.properties.map((p) => ({ value: p.id, label: p.name }))}
        />
      )}

      <TextField label={t('jobNew.titleField')} value={jobTitle} onChangeText={setJobTitle} />
      <TextField label={t('jobNew.description')} value={description} onChangeText={setDescription} multiline numberOfLines={4} />

      <Pressable onPress={() => createJob.mutate()} disabled={!canSubmit} style={[styles.submit, !canSubmit && styles.submitDisabled]}>
        <Text style={styles.submitText}>{createJob.isPending ? t('common.saving') : t('jobNew.submit')}</Text>
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
