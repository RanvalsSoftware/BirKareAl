export type GenerationStatus =
  | 'DRAFT'
  | 'VALIDATING'
  | 'MODERATING_INPUT'
  | 'BLOCKED'
  | 'QUEUED'
  | 'PREPARING'
  | 'GENERATING'
  | 'POST_PROCESSING'
  | 'MODERATING_OUTPUT'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type GenerationPresentation = {
  id: string;
  projectId: string;
  status: GenerationStatus;
  stage: string | null;
  progress: number;
  message: string;
  failure: { code: string; message: string } | null;
  createdAt?: string;
  updatedAt?: string;
  credit?: { reserved: number; charged: number; refunded: number };
};

/** Refund success comes from the ledger response, never from a stopped spinner. */
export function generationCreditNotice(generation: GenerationPresentation | null): string | null {
  if (!generation || !['FAILED', 'BLOCKED', 'CANCELLED'].includes(generation.status)) return null;
  const credit = generation.credit;
  if (!credit) return null;
  if (Number.isSafeInteger(credit.refunded) && credit.refunded > 0)
    return `${credit.refunded} kredi hesabına iade edildi.`;
  if (credit.charged === 0 && credit.reserved === 0) return 'Bu işlem için kredi alınmadı.';
  return 'Kredi durumunu Krediler bölümünden kontrol edebilirsin.';
}

/** Never rerender an orphaned job automatically: cancellation is the user's choice. */
export function isQueueWaitProlonged(generation: GenerationPresentation | null, now = Date.now()) {
  if (generation?.status !== 'QUEUED') return false;
  const since = Date.parse(generation.updatedAt ?? generation.createdAt ?? '');
  return Number.isFinite(since) && now - since > 120_000;
}

export const terminalGenerationStatuses = new Set<GenerationStatus>([
  'COMPLETED',
  'FAILED',
  'BLOCKED',
  'CANCELLED',
]);

export const generationPhases = [
  { label: 'Fotoğraf analizi', detail: 'Fotoğrafın ve üretim ayarların kontrol ediliyor.' },
  { label: 'Sahne hazırlığı', detail: 'Seçtiğin sahne ve görünüm hazırlanıyor.' },
  { label: 'AI ile oluşturma', detail: 'Fotoğrafın, seçtiğin görünümle yeniden işleniyor.' },
  { label: 'Son kontroller', detail: 'Görselin işleniyor ve güvenlik kontrolünden geçiriliyor.' },
];

function phaseForStatus(status: GenerationStatus | undefined) {
  switch (status) {
    case 'QUEUED':
    case 'PREPARING':
      return 1;
    case 'GENERATING':
      return 2;
    case 'POST_PROCESSING':
    case 'MODERATING_OUTPUT':
      return 3;
    case 'COMPLETED':
      return 4;
    default:
      return 0;
  }
}

/** Failure/cancellation may carry progress=100 from the API; that is not successful completion. */
export function generationProgressView(
  generation: GenerationPresentation | null,
  lastWorkingGeneration: GenerationPresentation | null = null,
) {
  const status = generation?.status;
  const completed = status === 'COMPLETED';
  const stopped = status === 'FAILED' || status === 'BLOCKED' || status === 'CANCELLED';
  const working =
    stopped && lastWorkingGeneration?.id === generation?.id
      ? lastWorkingGeneration
      : stopped
        ? null
        : generation;
  const reportedProgress = working?.progress ?? 0;
  const progress = completed
    ? 100
    : Number.isFinite(reportedProgress)
      ? Math.max(0, Math.min(99, reportedProgress))
      : 0;
  const phaseIndex = phaseForStatus(working?.status);

  return {
    progress,
    completed,
    stopped,
    completedPhases: completed ? generationPhases.length : phaseIndex,
    activePhase: generation && !stopped && !completed ? phaseIndex : -1,
    detail: !generation
      ? 'Üretimin güncel durumu alınıyor.'
      : status === 'QUEUED'
        ? 'Üretimin sırada. Sıra geldiğinde hazırlık başlayacak.'
        : status === 'MODERATING_INPUT'
          ? 'Fotoğrafın ve talebin güvenlik açısından inceleniyor.'
          : status === 'MODERATING_OUTPUT'
            ? 'Oluşturulan görselin son güvenlik kontrolü yapılıyor.'
            : generationPhases[Math.min(phaseIndex, generationPhases.length - 1)]!.detail,
  };
}
