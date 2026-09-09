import { describe, expect, it } from 'vitest';

import {
  generationProgressView,
  generationCreditNotice,
  isQueueWaitProlonged,
  type GenerationPresentation,
  type GenerationStatus,
} from './generation-progress';

function generation(status: GenerationStatus, progress: number): GenerationPresentation {
  return {
    id: 'generation-1',
    projectId: 'project-1',
    status,
    progress,
    stage: 'OPENAI_IMAGE_GENERATION',
    message: '',
    failure: null,
  };
}

describe('generation progress presentation', () => {
  it('shows the actual refund amount without assuming every stopped job was refunded', () => {
    expect(
      generationCreditNotice({
        ...generation('BLOCKED', 100),
        credit: { reserved: 1, charged: 0, refunded: 1 },
      }),
    ).toBe('1 kredi hesabına iade edildi.');
    expect(
      generationCreditNotice({
        ...generation('FAILED', 100),
        credit: { reserved: 2, charged: 0, refunded: 0 },
      }),
    ).not.toContain('iade edildi');
    expect(generationCreditNotice(generation('BLOCKED', 100))).toBeNull();
    expect(
      generationCreditNotice({
        ...generation('GENERATING', 65),
        credit: { reserved: 2, charged: 0, refunded: 0 },
      }),
    ).toBeNull();
  });
  it('warns about prolonged queue waits without treating them as success or cancelling work', () => {
    const now = Date.parse('2026-09-08T08:00:00Z');
    const queued = { ...generation('QUEUED', 25), updatedAt: '2026-09-08T07:55:00Z' };
    expect(isQueueWaitProlonged(queued, now)).toBe(true);
    expect(generationProgressView(queued).stopped).toBe(false);
    expect(isQueueWaitProlonged({ ...queued, updatedAt: '2026-09-08T07:59:00Z' }, now)).toBe(false);
    expect(isQueueWaitProlonged({ ...queued, updatedAt: 'bad-date' }, now)).toBe(false);
    expect(isQueueWaitProlonged({ ...queued, status: 'COMPLETED' }, now)).toBe(false);
    expect(isQueueWaitProlonged(null, now)).toBe(false);
  });
  it('does not check off the currently running phase', () => {
    expect(generationProgressView(generation('GENERATING', 65))).toMatchObject({
      progress: 65,
      completedPhases: 2,
      activePhase: 2,
      completed: false,
    });
    expect(generationProgressView(generation('MODERATING_OUTPUT', 95))).toMatchObject({
      completedPhases: 3,
      activePhase: 3,
    });
  });

  it.each(['FAILED', 'BLOCKED', 'CANCELLED'] as const)(
    'does not display %s=100 as successful completion',
    (status) => {
      expect(
        generationProgressView(generation(status, 100), generation('GENERATING', 65)),
      ).toMatchObject({
        progress: 65,
        completedPhases: 2,
        activePhase: -1,
        completed: false,
        stopped: true,
      });
      expect(generationProgressView(generation(status, 100))).toMatchObject({
        progress: 0,
        completedPhases: 0,
        activePhase: -1,
      });
    },
  );

  it('only fills the ring and all checks when the server confirms completion', () => {
    expect(generationProgressView(generation('COMPLETED', 100))).toMatchObject({
      progress: 100,
      completedPhases: 4,
      activePhase: -1,
      completed: true,
    });
    expect(generationProgressView(generation('GENERATING', 100)).progress).toBe(99);
  });

  it('does not show internal provider stages or reuse another generation progress', () => {
    expect(generationProgressView(generation('GENERATING', 65)).detail).not.toContain('OPENAI');
    const other = { ...generation('GENERATING', 65), id: 'another-generation' };
    expect(generationProgressView(generation('FAILED', 100), other).progress).toBe(0);
    expect(generationProgressView(null).activePhase).toBe(-1);
  });
});
