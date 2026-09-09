import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/metrics';

type AuthInputProps = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  password?: boolean;
};

export function AuthInput({ label, icon, password = false, ...props }: AuthInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons color={colors.textMuted} name={icon} size={19} />
        <TextInput
          autoCapitalize="none"
          placeholderTextColor={colors.textMuted}
          secureTextEntry={password && !visible}
          selectionColor={colors.accent}
          style={styles.input}
          {...props}
        />
        {password ? (
          <Pressable accessibilityLabel={visible ? 'Şifreyi gizle' : 'Şifreyi göster'} accessibilityRole="button" hitSlop={10} onPress={() => setVisible((value) => !value)}>
            <Ionicons color={colors.textSecondary} name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  inputWrap: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: 11, minHeight: 56, paddingHorizontal: 16 },
  input: { color: colors.text, flex: 1, fontSize: 15, minHeight: 54 },
});
