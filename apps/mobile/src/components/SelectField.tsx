import { Platform, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, spacing } from '../theme';

interface Option<T extends string> {
  value: T;
  label: string;
}

/**
 * A labeled dropdown - stands in for the web app's <select> across the New
 * Job/Quote/Invoice forms. Renders as Android's native dropdown or iOS's
 * inline wheel (the platform's own Picker component, not a custom modal -
 * simplest thing that's actually correct, worth revisiting for a nicer iOS
 * look once this can be checked on a real device).
 */
export default function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: T | '';
  onChange: (value: T) => void;
  options: Option<T>[];
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerWrap}>
        <Picker selectedValue={value} onValueChange={(v) => onChange(v as T)} style={styles.picker}>
          {placeholder ? <Picker.Item label={placeholder} value="" color={colors.textMuted} /> : null}
          {options.map((opt) => (
            <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontSize: 13, color: colors.textMuted },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  picker: Platform.select({ ios: { height: 150 }, default: { height: 48 } }),
});
