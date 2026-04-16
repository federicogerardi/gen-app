'use client';

import { Badge } from '@/components/ui/badge';
import { useRuntimeInfo } from './RuntimeInfoProvider';

export function RuntimeStatusBadge() {
  const { channel, channelLabel, versionLabel } = useRuntimeInfo();
  const highlightVersion = channel === 'development' || channel === 'preview';

  return (
    <Badge
      variant="secondary"
      className="font-medium tracking-wide"
      aria-label={`Ambiente ${channelLabel}, versione applicazione ${versionLabel}`}
      data-testid="runtime-status-badge"
    >
      <span>{`${channelLabel} • `}</span>
      <span className={highlightVersion ? 'text-orange-700' : undefined}>{versionLabel}</span>
    </Badge>
  );
}