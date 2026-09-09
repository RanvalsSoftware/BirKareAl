import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { CategoryId, FilterId, PhotoSelection } from '@/src/types/onboarding';
import {
  readOnboardingCompleted,
  readStoredPreference,
  resetOnboardingStorage,
  writeOnboardingCompleted,
  writeStoredPreference,
} from '@/src/utils/storage';

type OnboardingContextValue = {
  ready: boolean;
  completed: boolean;
  selectedPhoto: PhotoSelection | null;
  selectedCategoryId: CategoryId;
  selectedFilterId: FilterId;
  setSelectedPhoto: (photo: PhotoSelection | null) => void;
  setSelectedCategoryId: (id: CategoryId) => void;
  setSelectedFilterId: (id: FilterId) => void;
  markCompleted: () => Promise<void>;
  resetDemo: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

const DEFAULT_CATEGORY: CategoryId = 'fan-selfie';
const DEFAULT_FILTER: FilterId = 'cinematic';

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoSelection | null>(null);
  const [selectedCategoryIdState, setSelectedCategoryIdState] = useState<CategoryId>(DEFAULT_CATEGORY);
  const [selectedFilterIdState, setSelectedFilterIdState] = useState<FilterId>(DEFAULT_FILTER);

  useEffect(() => {
    let mounted = true;

    void Promise.all([
      readOnboardingCompleted(),
      readStoredPreference('selectedCategory'),
      readStoredPreference('selectedFilter'),
    ])
      .then(([hasCompleted, storedCategory, storedFilter]) => {
        if (!mounted) return;
        setCompleted(hasCompleted);
        if (storedCategory) setSelectedCategoryIdState(storedCategory as CategoryId);
        if (storedFilter) setSelectedFilterIdState(storedFilter as FilterId);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setSelectedCategoryId = useCallback((id: CategoryId) => {
    setSelectedCategoryIdState(id);
    void writeStoredPreference('selectedCategory', id);
  }, []);

  const setSelectedFilterId = useCallback((id: FilterId) => {
    setSelectedFilterIdState(id);
    void writeStoredPreference('selectedFilter', id);
  }, []);

  const markCompleted = useCallback(async () => {
    await writeOnboardingCompleted(true);
    setCompleted(true);
  }, []);

  const resetDemo = useCallback(async () => {
    await resetOnboardingStorage();
    setSelectedPhoto(null);
    setSelectedCategoryIdState(DEFAULT_CATEGORY);
    setSelectedFilterIdState(DEFAULT_FILTER);
    setCompleted(false);
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      ready,
      completed,
      selectedPhoto,
      selectedCategoryId: selectedCategoryIdState,
      selectedFilterId: selectedFilterIdState,
      setSelectedPhoto,
      setSelectedCategoryId,
      setSelectedFilterId,
      markCompleted,
      resetDemo,
    }),
    [
      completed,
      markCompleted,
      ready,
      resetDemo,
      selectedCategoryIdState,
      selectedFilterIdState,
      selectedPhoto,
      setSelectedCategoryId,
      setSelectedFilterId,
    ],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error('useOnboarding must be used inside OnboardingProvider.');
  return value;
}
