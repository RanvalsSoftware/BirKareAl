import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';

import { apiRequest } from '@/api/client';
import { useAuthStore } from '@/features/auth/auth-store';
import { accountQueryKey } from '@/features/auth/account-query-cache';

export const USER_PROJECTS_QUERY_KEY = ['projects', 'current-user'] as const;

type ProjectMode =
  'FULL_SCENE' | 'FAN_MOMENT' | 'AI_FILTER' | 'PRO_PORTRAIT' | 'BACKGROUND_REPLACE';

type ProjectListItem = {
  id: string;
  title: string | null;
  mode: ProjectMode;
  status: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

type ProjectListPage = {
  items: ProjectListItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

type GenerationOutput = {
  assetId: string;
  selected: boolean;
  variantIndex: number;
};

type ProjectGeneration = {
  id: string;
  status: string;
  createdAt: string;
  outputs: GenerationOutput[];
};

type ProjectDetailResponse = {
  generations: ProjectGeneration[];
};

export type UserProject = ProjectListItem & {
  /** The newest completed generation that has a displayable AI output. */
  outputGenerationId: string | null;
  outputAssetId: string | null;
  /** The latest job is useful for showing that a project is still in progress. */
  latestGenerationStatus: string | null;
};

function preferredOutput(generation: ProjectGeneration): GenerationOutput | null {
  return generation.outputs.find((output) => output.selected) ?? generation.outputs[0] ?? null;
}

async function fetchCurrentUserProjects(signal: AbortSignal): Promise<UserProject[]> {
  // Read every cursor page rather than making a locally cached subset look
  // like the user's full history. The server caps each request at 50 records.
  const allProjects: ProjectListItem[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const page: ProjectListPage = await apiRequest<ProjectListPage>(
      `/v1/projects?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
      { signal },
    );
    allProjects.push(...page.items);
    cursor = page.nextCursor;
    hasMore = page.hasMore && Boolean(cursor);
  }

  return Promise.all(
    allProjects.map(async (project) => {
      const detail = await apiRequest<ProjectDetailResponse>(
        `/v1/projects/${encodeURIComponent(project.id)}`,
        { signal },
      );
      const generations = [...detail.generations].sort(
        (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
      );
      const completed = generations.find(
        (generation) => generation.status === 'COMPLETED' && generation.outputs.length > 0,
      );
      const output = completed ? preferredOutput(completed) : null;

      return {
        ...project,
        outputGenerationId: completed?.id ?? null,
        outputAssetId: output?.assetId ?? null,
        latestGenerationStatus: generations[0]?.status ?? null,
      };
    }),
  );
}

/**
 * Reads only records owned by the authenticated user. The detail endpoint
 * already supplies each generation's output asset IDs, so a new API endpoint
 * is not needed to render the current user's real AI results.
 */
export function useUserProjects() {
  const authenticated = useAuthStore((store) => store.state === 'authenticated');
  const userId = useAuthStore((store) => store.user?.id);
  const query = useQuery({
    queryKey: accountQueryKey(USER_PROJECTS_QUERY_KEY, userId),
    queryFn: ({ signal }) => fetchCurrentUserProjects(signal),
    enabled: authenticated && Boolean(userId),
    staleTime: 0,
  });
  const { refetch } = query;

  useFocusEffect(
    useCallback(() => {
      if (authenticated) void refetch();
    }, [authenticated, refetch]),
  );

  return query;
}
