import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';

type SectionTitleProps = {
  title: string;
  action?: string;
};

export function SectionTitle({ title, action }: SectionTitleProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? <Text style={styles.action}>{action}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: -0.45 },
  action: { color: colors.accent, fontSize: 12, fontWeight: '800' },
});
