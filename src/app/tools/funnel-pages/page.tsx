'use client';

import { Suspense } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { FunnelPagesToolContent } from './FunnelPagesToolContent';

export default function FunnelPagesToolPage() {
  return (
    <Suspense
      fallback={(
        <PageShell width="workspace">
          <div className="py-10 text-sm text-muted-foreground" role="status" aria-live="polite" aria-atomic="true">
            Caricamento HotLeadFunnel...
          </div>
        </PageShell>
      )}
    >
      <FunnelPagesToolContent />
    </Suspense>
  );
}
