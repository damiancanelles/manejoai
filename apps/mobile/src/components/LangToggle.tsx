import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n, type Lang } from '../i18n';
import { colors } from '../theme';

const LANGS: Lang[] = ['en', 'es'];

/** EN / ES segmented switch - mirrors apps/web/src/components/LangToggle.tsx. */
export default function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <View style={styles.row}>
      {LANGS.map((l) => {
        const active = lang === l;
        return (
          <Pressable
            key={l}
            onPress={() => setLang(l)}
            style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
          >
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
              {l.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  pill: { paddingVertical: 6, paddingHorizontal: 12 },
  pillActive: { backgroundColor: colors.accent },
  pillInactive: { backgroundColor: colors.surface },
  label: { fontSize: 12, fontWeight: '600' },
  labelActive: { color: '#fff' },
  labelInactive: { color: colors.textMuted },
});
