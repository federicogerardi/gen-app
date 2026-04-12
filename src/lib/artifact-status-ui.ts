import type { ArtifactStatus } from '@/lib/types/artifact';

const ARTIFACT_STATUS_LABEL: Record<ArtifactStatus, string> = {
  generating: 'In corso',
  completed: 'Completato',
  failed: 'Errore',
};

const ARTIFACT_STATUS_BADGE_CLASS: Record<ArtifactStatus, string> = {
  generating: 'border-amber-300 bg-amber-100 text-amber-900',
  completed: 'border-emerald-300 bg-emerald-100 text-emerald-900',
  failed: 'border-rose-300 bg-rose-100 text-rose-900',
};

export function getArtifactStatusLabel(status: ArtifactStatus): string {
  return ARTIFACT_STATUS_LABEL[status];
}

export function getArtifactStatusBadgeClass(status: ArtifactStatus): string {
  return ARTIFACT_STATUS_BADGE_CLASS[status];
}