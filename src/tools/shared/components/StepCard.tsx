'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type ToolStepState } from '../types/tool.types';

/**
 * StepCardProps — Generic step card properties
 * Accepts tool-specific status types via generic TStatus
 */
export interface StepCardProps<TStatus extends string = string> {
  step: Omit<ToolStepState<string>, 'status'> & { status: TStatus };
  statusLabel: Record<TStatus, string>;
  statusBadgeClass: Record<TStatus, string>;
  onViewClick?: () => void;
  onRegenerateClick?: () => void;
  isGenerating?: boolean;
  showActions?: boolean;
}

/**
 * StepCard — Reusable step visualization component
 * - Generic status handling with custom labels and styles
 * - Optional action buttons (view, regenerate)
 * - Error state display
 */
export function StepCard<TStatus extends string = string>({
  step,
  statusLabel,
  statusBadgeClass,
  onViewClick,
  onRegenerateClick,
  isGenerating = false,
  showActions = true,
}: StepCardProps<TStatus>) {
  const hasContent = step.content?.trim().length ?? 0 > 0;
  const hasError = Boolean(step.error);

  return (
    <Card className="overflow-hidden border border-slate-200">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-slate-900">{step.title}</CardTitle>
          <Badge variant="outline" className={`whitespace-nowrap ${statusBadgeClass[step.status]}`}>
            {statusLabel[step.status]}
          </Badge>
        </div>

        {hasError && (
          <div className="rounded-md border border-rose-200 bg-rose-50/70 px-3 py-2">
            <p className="text-xs font-medium text-rose-900">{step.error}</p>
          </div>
        )}
      </CardHeader>

      {hasContent && (
        <CardContent className="space-y-3 pb-3">
          <div className="max-h-48 overflow-y-auto rounded-md bg-slate-50 p-3">
            <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap break-words">
              {step.content.slice(0, 500)}
              {step.content.length > 500 ? '...' : ''}
            </p>
          </div>
        </CardContent>
      )}

      {showActions && (
        <div className="flex gap-2 border-t border-slate-200 bg-slate-50/50 px-3 py-2.5">
          {hasContent && onViewClick && (
            <Button size="sm" variant="outline" onClick={onViewClick} disabled={isGenerating}>
              Visualizza
            </Button>
          )}
          {onRegenerateClick && (
            <Button size="sm" variant="ghost" onClick={onRegenerateClick} disabled={isGenerating || hasError}>
              Rigenera
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
