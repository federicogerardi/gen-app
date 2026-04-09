'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="it">
      <body>
        <main className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-2">
            <h1 className="text-2xl font-semibold">Si e verificato un errore</h1>
            <p className="text-sm text-muted-foreground">
              Il problema e stato registrato automaticamente. Riprova tra qualche secondo.
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
