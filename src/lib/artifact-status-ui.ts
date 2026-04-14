import type { ArtifactStatus } from '@/lib/types/artifact';

const ARTIFACT_STATUS_LABEL: Record<ArtifactStatus, string> = {
  generating: 'In corso',
  completed: 'Completato',
  failed: 'Errore',
};

const ARTIFACT_STATUS_BADGE_CLASS: Record<ArtifactStatus, string> = {
  generating: 'border-amber-400 bg-amber-200 text-amber-950',
  completed: 'border-emerald-400 bg-emerald-200 text-emerald-950',
  failed: 'border-rose-400 bg-rose-200 text-rose-950',
};

export function getArtifactStatusLabel(status: ArtifactStatus): string {
  return ARTIFACT_STATUS_LABEL[status];
}

export function getArtifactStatusBadgeClass(status: ArtifactStatus): string {
  return ARTIFACT_STATUS_BADGE_CLASS[status];
}