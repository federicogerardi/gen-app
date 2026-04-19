'use client';

import { Suspense } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { NextLandToolContent } from './NextLandToolContent';

export default function NextLandToolPage() {
  return (
    <Suspense
      fallback={(
        <PageShell width="workspace">
          <div className="py-10 text-sm text-muted-foreground" role="status" aria-live="polite" aria-atomic="true">
            Caricamento NextLand...
          </div>
        </PageShell>
      )}
    >
      <NextLandToolContent />
    </Suspense>
  );
}