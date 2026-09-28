import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/client', () => ({ apiRequest: vi.fn() }));

import { createContentReportInput, validSupportInput } from './tickets';

describe('generation content report', () => {
  it('creates a bounded persistent support ticket tied to the generation and selected output', () => {
    const input = createContentReportInput({
      generationId: '6d61756f-9088-427c-98a7-13fc88890a8c',
      outputId: '4b7b9a54-73f1-47c8-a095-e7fc53ac83e4',
      reason: '  İzinsiz yüz kullanımı ',
      detail: '  Bu kişi kullanım için izin vermedi. ',
    });

    expect(input).toMatchObject({
      category: 'CONTENT_REPORT',
      generationId: '6d61756f-9088-427c-98a7-13fc88890a8c',
      subject: 'İçerik raporu: İzinsiz yüz kullanımı',
    });
    expect(input.message).toContain('Raporlanan çıktı: 4b7b9a54-73f1-47c8-a095-e7fc53ac83e4');
    expect(input.message).toContain('Açıklama: Bu kişi kullanım için izin vermedi.');
    expect(validSupportInput(input)).toBe(true);
  });

  it('keeps a report valid when the optional explanation is empty', () => {
    const input = createContentReportInput({
      generationId: '6d61756f-9088-427c-98a7-13fc88890a8c',
      reason: 'Diğer',
      detail: '   ',
    });

    expect(input.message).toContain('Ek açıklama verilmedi.');
    expect(validSupportInput(input)).toBe(true);
  });
});
