import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, spacing } from '../theme';

export default function TextField({
  label,
  ...inputProps
}: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, inputProps.multiline && styles.multiline]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontSize: 13, color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
});
