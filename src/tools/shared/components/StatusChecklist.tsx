'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface ChecklistItem {
  id: string;
  label: string;
  status: 'todo' | 'active' | 'done' | 'error';
  errorMessage?: string;
}

export interface StatusChecklistProps {
  title?: string;
  description?: string;
  items: ChecklistItem[];
  statusLabels?: Record<'todo' | 'active' | 'done' | 'error', string>;
  statusBadgeClass?: Record<'todo' | 'active' | 'done' | 'error', string>;
  isCollapsible?: boolean;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

const DEFAULT_STATUS_LABELS: Record<'todo' | 'active' | 'done' | 'error', string> = {
  todo: 'Da completare',
  active: 'In corso',
  done: 'Pronto',
  error: 'Bloccato',
};

const DEFAULT_BADGE_CLASS: Record<'todo' | 'active' | 'done' | 'error', string> = {
  todo: 'border-slate-300 bg-slate-100 text-slate-700',
  active: 'border-amber-300 bg-amber-100 text-amber-900',
  done: 'border-emerald-300 bg-emerald-100 text-emerald-900',
  error: 'border-rose-300 bg-rose-100 text-rose-900',
};

/**
 * StatusChecklist — Reusable status widget for tool workflows
 * - Multi-item checklist with generic status tracking
 * - Optional collapsible UI
 * - Customizable labels and styles
 */
export function StatusChecklist({
  title = 'Status',
  description,
  items,
  statusLabels = DEFAULT_STATUS_LABELS,
  statusBadgeClass = DEFAULT_BADGE_CLASS,
  isCollapsible = true,
  isOpen = true,
  onToggle,
}: StatusChecklistProps) {
  const hasErrors = items.some((item) => item.status === 'error');
  const allDone = items.every((item) => item.status === 'done');

  const summaryClass = hasErrors
    ? 'border-rose-300 bg-rose-50/90'
    : allDone
      ? 'border-emerald-300 bg-emerald-50/90'
      : 'border-slate-200 bg-slate-50/50';

  const content = (
    <Card className={`border rounded-2xl shadow-sm transition-colors ${summaryClass}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription className="text-xs mt-1">{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{item.label}</p>
              {item.errorMessage && item.status === 'error' && (
                <p className="text-xs text-rose-700 mt-1">{item.errorMessage}</p>
              )}
            </div>
            <Badge variant="outline" className={`whitespace-nowrap shrink-0 ${statusBadgeClass[item.status]}`}>
              {statusLabels[item.status]}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  if (!isCollapsible) {
    return content;
  }

  return (
    <details
      open={isOpen}
      onToggle={(event) => onToggle?.(event.currentTarget.open)}
      className={`group rounded-2xl border px-4 py-3 shadow-sm transition-colors ${summaryClass}`}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
        <div>
          <p className="font-medium text-sm text-slate-900">{title}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <svg
          className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </summary>

      <div className="mt-3 space-y-2.5 border-t border-slate-200 pt-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{item.label}</p>
              {item.errorMessage && item.status === 'error' && (
                <p className="text-xs text-rose-700 mt-1">{item.errorMessage}</p>
              )}
            </div>
            <Badge variant="outline" className={`whitespace-nowrap shrink-0 ${statusBadgeClass[item.status]}`}>
              {statusLabels[item.status]}
            </Badge>
          </div>
        ))}
      </div>
    </details>
  );
}
