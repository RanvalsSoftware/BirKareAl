import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  type OnboardingCategoryId,
  type OnboardingFilterId,
  type OnboardingPhoto,
} from './data';
import { getOnboardingCompleted, setOnboardingCompleted } from './storage';

type OnboardingContextValue = {
  ready: boolean;
  completed: boolean;
  selectedPhoto: OnboardingPhoto | null;
  selectedCategoryId: OnboardingCategoryId;
  selectedFilterId: OnboardingFilterId;
  setSelectedPhoto: (photo: OnboardingPhoto | null) => void;
  setSelectedCategoryId: (id: OnboardingCategoryId) => void;
  setSelectedFilterId: (id: OnboardingFilterId) => void;
  markCompleted: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<OnboardingPhoto | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<OnboardingCategoryId>('fan-selfie');
  const [selectedFilterId, setSelectedFilterId] = useState<OnboardingFilterId>('cinematic');

  useEffect(() => {
    let mounted = true;
    void getOnboardingCompleted()
      .then((value) => {
        if (mounted) setCompleted(value);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const markCompleted = useCallback(async () => {
    await setOnboardingCompleted(true);
    setCompleted(true);
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      ready,
      completed,
      selectedPhoto,
      selectedCategoryId,
      selectedFilterId,
      setSelectedPhoto,
      setSelectedCategoryId,
      setSelectedFilterId,
      markCompleted,
    }),
    [completed, markCompleted, ready, selectedCategoryId, selectedFilterId, selectedPhoto],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error('useOnboarding must be used inside OnboardingProvider.');
  return value;
}
