import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  onboardingCompleted: 'birkare:onboarding-completed:v1',
  selectedCategory: 'birkare:selected-category:v1',
  selectedFilter: 'birkare:selected-filter:v1',
} as const;

export async function readOnboardingCompleted(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.onboardingCompleted)) === 'true';
}

export async function writeOnboardingCompleted(value: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.onboardingCompleted, value ? 'true' : 'false');
}

export async function readStoredPreference(key: 'selectedCategory' | 'selectedFilter') {
  return AsyncStorage.getItem(KEYS[key]);
}

export async function writeStoredPreference(
  key: 'selectedCategory' | 'selectedFilter',
  value: string,
): Promise<void> {
  await AsyncStorage.setItem(KEYS[key], value);
}

export async function resetOnboardingStorage(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
