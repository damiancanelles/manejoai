import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { useT } from '../i18n';
import Badge from '../components/Badge';
import ListRow from '../components/ListRow';
import TextField from '../components/TextField';
import { colors, spacing } from '../theme';
import type { MoreStackParamList } from '../navigation/types';

interface CrewMember {
  id: string;
  name: string;
  email: string;
  active: boolean;
}
interface TimeEntryRow {
  userId: string;
  clockOut: string | null;
}

export default function TeamScreen() {
  const t = useT();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { data: crew = [], isLoading } = useQuery({
    queryKey: ['users', 'crew'],
    queryFn: () => api.get<CrewMember[]>('/users'),
  });
  const { data: entries = [] } = useQuery({
    queryKey: ['time-entries', 'all'],
    queryFn: () => api.get<TimeEntryRow[]>('/time-entries'),
  });
  const clockedInIds = new Set(entries.filter((e) => !e.clockOut).map((e) => e.userId));

  const create = useMutation({
    mutationFn: () => api.post('/users', { name, email, password }),
    onSuccess: () => {
      setName('');
      setEmail('');
      setPassword('');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['users', 'crew'] });
    },
    onError: (err: any) => Alert.alert(t('assistant.error'), err.message),
  });

  const canCreate = !!name.trim() && !!email.trim() && password.length >= 8 && !create.isPending;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>{t('team.subtitle')}</Text>

      <Pressable onPress={() => setShowForm((v) => !v)} style={styles.addToggle}>
        <Text style={styles.addToggleText}>{showForm ? t('common.cancel') : t('team.add')}</Text>
      </Pressable>

      {showForm && (
        <View style={styles.formCard}>
          <TextField label={t('team.name')} value={name} onChangeText={setName} />
          <TextField label={t('team.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextField label={t('team.password')} value={password} onChangeText={setPassword} secureTextEntry />
          <Pressable onPress={() => create.mutate()} disabled={!canCreate} style={[styles.submitBtn, !canCreate && styles.btnDisabled]}>
            <Text style={styles.submitBtnText}>{create.isPending ? t('common.saving') : t('team.create')}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.list}>
        {crew.map((c) => (
          <ListRow
            key={c.id}
            title={c.name}
            subtitle={c.email}
            right={
              !c.active ? (
                <Badge label={t('team.deactivated')} tone="neutral" />
              ) : clockedInIds.has(c.id) ? (
                <Badge label={t('team.clockedIn')} tone="success" />
              ) : (
                <Badge label={t('team.active')} tone="neutral" />
              )
            }
            onPress={() => navigation.navigate('TeamMemberDetail', { crewId: c.id, crewName: c.name })}
          />
        ))}
        {!isLoading && crew.length === 0 && <Text style={styles.empty}>{t('team.empty')}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xl },
  subtitle: { fontSize: 12, color: colors.textMuted, padding: spacing.md, paddingBottom: 0 },
  addToggle: { alignSelf: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addToggleText: { fontSize: 14, fontWeight: '600', color: colors.accent },
  formCard: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginHorizontal: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  submitBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: spacing.xs },
  btnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  list: { borderTopWidth: 1, borderTopColor: colors.border },
  empty: { fontSize: 13, color: colors.textMuted, textAlign: 'center', padding: spacing.lg },
});
