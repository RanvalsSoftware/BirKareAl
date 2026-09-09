import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { resetCreateFlow, updateCreateFlow } from '@/features/create/createFlow';

/** Old catalogue links now open the source alternative, not a mandatory second person. */
export default function PersonScreen() {
  const router = useRouter();
  const { selected } = useLocalSearchParams<{ selected?: string }>();
  useEffect(() => {
    resetCreateFlow();
    updateCreateFlow({ sourceKind: 'fictional', mode: 'scene', personId: null });
    router.replace({
      pathname: '/create/upload',
      params: { source: 'fictional', ...(selected ? { selected } : {}) },
    } as never);
  }, [router, selected]);
  return null;
}
