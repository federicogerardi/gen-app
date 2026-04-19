'use client';

import { Badge } from '@/components/ui/badge';

export interface NextLandStatusQuickProps {
  isStatusOpen: boolean;
  setIsStatusOpen: (open: boolean) => void;
  hasExtractionError: boolean;
  canRunGeneration: boolean;
  hasProjectSelected: boolean;
  selectedProjectName: string | null;
  projectId: string;
  hasBriefingSource: boolean;
  hasCheckpointBriefing: boolean;
  uploadedFileName: string | null;
  uploadError: string | null;
  extractionError: string | null;
  isBriefingProcessing: boolean;
  phase: 'idle' | 'uploading' | 'extracting' | 'review' | 'generating';
  hasExtractionReady: boolean;
  running: boolean;
  retryNotice: string | null;
  resumeNotice: string | null;
}

export function NextLandStatusQuick({
  isStatusOpen,
  setIsStatusOpen,
  hasExtractionError,
  canRunGeneration,
  hasProjectSelected,
  selectedProjectName,
  projectId,
  hasBriefingSource,
  hasCheckpointBriefing,
  uploadedFileName,
  uploadError,
  extractionError,
  isBriefingProcessing,
  phase,
  hasExtractionReady,
  running,
  retryNotice,
  resumeNotice,
}: NextLandStatusQuickProps) {
  const extractionChecklistStatus: 'todo' | 'active' | 'done' | 'error' = hasExtractionError
    ? 'error'
    : isBriefingProcessing
      ? 'active'
      : hasExtractionReady
        ? 'done'
        : 'todo';

  const generationChecklistStatus: 'todo' | 'active' | 'done' = running
    ? 'active'
    : canRunGeneration
      ? 'done'
      : 'todo';

  const checklistBadgeClass: Record<'todo' | 'active' | 'done' | 'error', string> = {
    todo: 'border-slate-300 bg-slate-100 text-slate-700',
    active: 'border-amber-300 bg-amber-100 text-amber-900',
    done: 'border-emerald-300 bg-emerald-100 text-emerald-900',
    error: 'border-rose-300 bg-rose-100 text-rose-900',
  };

  const checklistBadgeLabel: Record<'todo' | 'active' | 'done' | 'error', string> = {
    todo: 'Da completare',
    active: 'In corso',
    done: 'Pronto',
    error: 'Bloccato',
  };

  return (
    <details
      open={isStatusOpen}
      onToggle={(event) => setIsStatusOpen(event.currentTarget.open)}
      className={[
        'group rounded-2xl border px-4 py-3 shadow-sm transition-colors',
        hasExtractionError
          ? 'border-rose-300 bg-rose-50/90'
          : canRunGeneration
            ? 'border-emerald-300 bg-emerald-50/90'
            : 'border-sky-300 bg-sky-50/90',
      ].join(' ')}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
        <span>Stato rapido</span>
        <span className="text-xs text-muted-foreground">{isStatusOpen ? 'Nascondi' : 'Mostra'}</span>
      </summary>

      <div className="mt-3 space-y-2" role="status" aria-live="polite">
        <div className="rounded-lg bg-white/70 px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-900">1. Progetto selezionato</p>
              <p className="mt-0.5 text-xs text-slate-700">
                {hasProjectSelected
                  ? (selectedProjectName ?? projectId)
                  : 'Seleziona un progetto per iniziare.'}
              </p>
            </div>
            <Badge variant="outline" className={checklistBadgeClass[hasProjectSelected ? 'done' : 'todo']}>
              {checklistBadgeLabel[hasProjectSelected ? 'done' : 'todo']}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg bg-white/70 px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-900">2. Briefing disponibile</p>
              <p className="mt-0.5 text-xs text-slate-700">
                {hasBriefingSource
                  ? (hasCheckpointBriefing ? 'Fonte: checkpoint estratto' : `File: ${uploadedFileName}`)
                  : 'Carica un briefing per continuare.'}
              </p>
            </div>
            <Badge variant="outline" className={checklistBadgeClass[hasBriefingSource ? 'done' : 'todo']}>
              {checklistBadgeLabel[hasBriefingSource ? 'done' : 'todo']}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg bg-white/70 px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-900">3. Estrazione</p>
              <p className="mt-0.5 text-xs text-slate-700">
                {hasExtractionError
                  ? (uploadError ?? extractionError)
                  : isBriefingProcessing
                    ? (phase === 'uploading' ? 'Caricamento briefing in corso.' : 'Estrazione in corso.')
                    : hasExtractionReady
                      ? 'Estrazione pronta.'
                      : 'In attesa del briefing.'}
              </p>
            </div>
            <Badge variant="outline" className={checklistBadgeClass[extractionChecklistStatus]}>
              {checklistBadgeLabel[extractionChecklistStatus]}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg bg-white/70 px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-900">4. Pronto a generare</p>
              <p className="mt-0.5 text-xs text-slate-700">
                {running
                  ? 'Generazione in corso.'
                  : canRunGeneration
                    ? 'Puoi avviare la generazione dei due step NextLand.'
                    : 'Completa gli step precedenti.'}
              </p>
            </div>
            <Badge variant="outline" className={checklistBadgeClass[generationChecklistStatus]}>
              {checklistBadgeLabel[generationChecklistStatus]}
            </Badge>
          </div>
        </div>

        {retryNotice && (
          <div className="rounded-lg bg-white/70 px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-900">Aggiornamento</p>
                <p className="mt-0.5 text-xs text-slate-700">{retryNotice}</p>
              </div>
              <Badge variant="outline" className={checklistBadgeClass.active}>
                {checklistBadgeLabel.active}
              </Badge>
            </div>
          </div>
        )}

        {resumeNotice && (
          <div className="rounded-lg bg-white/70 px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-900">Aggiornamento</p>
                <p className="mt-0.5 text-xs text-slate-700">{resumeNotice}</p>
              </div>
              <Badge variant="outline" className={checklistBadgeClass.active}>
                {checklistBadgeLabel.active}
              </Badge>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}