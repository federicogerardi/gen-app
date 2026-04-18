'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatArtifactContentForDisplay } from '@/lib/artifact-preview';
import { STEP_STATUS_BADGE_CLASS, STEP_STATUS_LABEL } from '../config';
import type { NextLandStepState } from '../types';

export interface NextLandStepCardsProps {
  steps: NextLandStepState[];
  onOpenArtifact: (artifactId: string) => void;
}

export function NextLandStepCards({ steps, onOpenArtifact }: NextLandStepCardsProps) {
  return (
    <>
      {steps.map((step) => {
        const stepDisplay = formatArtifactContentForDisplay({
          type: 'content',
          status: step.status === 'error' ? 'failed' : step.content ? 'completed' : step.status === 'running' ? 'generating' : 'completed',
          content: step.content,
          workflowType: 'nextland',
        });

        return (
          <Card key={step.key} className="app-surface app-rise rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{step.title}</CardTitle>
                <Badge variant="outline" className={STEP_STATUS_BADGE_CLASS[step.status]}>
                  {STEP_STATUS_LABEL[step.status]}
                </Badge>
              </div>
              <CardDescription>
                {step.key === 'landing' && 'Pagina di acquisizione principale'}
                {step.key === 'thank_you' && 'Pagina post-conversione e next step'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="sr-only" aria-live="polite">
                {step.status === 'running' ? `${step.title} in generazione` : `${step.title} aggiornato`}
              </p>
              {step.content ? (
                <div className="max-h-64 overflow-y-auto rounded-xl border border-black/10 bg-white/70 p-4" aria-live="polite">
                  <p className="break-words whitespace-pre-wrap text-sm leading-7 text-foreground">{stepDisplay.text}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {step.status === 'running' ? stepDisplay.text : 'Nessun output ancora.'}
                </p>
              )}
              {step.error && <p className="text-sm text-destructive" role="alert" aria-live="assertive">{step.error}</p>}
              {step.artifactId && (
                <Button variant="outline" size="sm" onClick={() => onOpenArtifact(step.artifactId as string)}>
                  Apri artefatto
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}