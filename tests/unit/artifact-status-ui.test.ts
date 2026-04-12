import { getArtifactStatusBadgeClass, getArtifactStatusLabel } from '@/lib/artifact-status-ui';

describe('artifact status ui helpers', () => {
  it('maps statuses to Italian labels', () => {
    expect(getArtifactStatusLabel('generating')).toBe('In corso');
    expect(getArtifactStatusLabel('completed')).toBe('Completato');
    expect(getArtifactStatusLabel('failed')).toBe('Errore');
  });

  it('maps statuses to consistent badge color classes', () => {
    expect(getArtifactStatusBadgeClass('generating')).toContain('amber');
    expect(getArtifactStatusBadgeClass('completed')).toContain('emerald');
    expect(getArtifactStatusBadgeClass('failed')).toContain('rose');
  });
});