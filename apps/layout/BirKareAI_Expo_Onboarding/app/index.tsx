import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useOnboarding } from '@/src/context/OnboardingContext';
import { colors } from '@/src/theme/colors';

export default function IndexScreen() {
  const { ready, completed } = useOnboarding();

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return <Redirect href={completed ? '/(tabs)/home' : '/(onboarding)/splash'} />;
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
});
