'use client';

import { useCallback, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectDialog, type ProjectOption } from './ProjectDialog';

export interface ModelOption {
  id: string;
  name: string;
  default?: boolean;
}

export interface ToolSetupFieldMap {
  [key: string]: unknown;
}

export interface ToolSetupConfig {
  projectId: string;
  model: string;
  tone: string;
  notes: string;
  uploadedFileName: string | null;
  fileInputId: string;
  isUploadDisabled?: boolean;
  isProjectDialogOpen?: boolean;
}

export interface ToolSetupProps {
  config: ToolSetupConfig;
  onProjectChange: (projectId: string) => void;
  onModelChange: (modelId: string) => void;
  onToneChange: (tone: string) => void;
  onNotesChange: (notes: string) => void;
  onFileChange: (file: File) => void;
  onProjectDialogChange: (open: boolean) => void;
  projects: ProjectOption[];
  models: ModelOption[];
  tones: readonly string[];
  toneHints?: Record<string, string>;
  primaryAction: {
    label: string;
    disabled: boolean;
    onClick?: () => void;
  };
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }>;
  title?: string;
  description?: string;
  hasExtractionReady?: boolean;
  selectedProject?: ProjectOption | null;
  loadingProjects?: boolean;
  loadingModels?: boolean;
  children?: ReactNode;
}

/**
 * ToolSetup — Generic form setup component
 * - Project selection, file upload, model/tone selection
 * - Flexible configuration via props
 * - Extensible with custom children
 */
export function ToolSetup({
  config,
  onProjectChange,
  onModelChange,
  onToneChange,
  onNotesChange,
  onFileChange,
  onProjectDialogChange,
  projects,
  models,
  tones,
  toneHints,
  primaryAction,
  secondaryActions,
  title = 'Setup',
  description = 'Completa i campi essenziali.',
  hasExtractionReady = false,
  loadingProjects = false,
  loadingModels = false,
  children,
}: ToolSetupProps) {
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.currentTarget.files?.[0];
      if (file) {
        onFileChange(file);
      }
    },
    [onFileChange],
  );

  return (
    <Card className="app-surface app-rise rounded-3xl">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-6">
          {/* Section 1: Project Selection */}
          <section className="space-y-4">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">1. Progetto</p>
                <label htmlFor={config.fileInputId} className="flex items-center justify-between gap-3">
                  <Label>Seleziona il progetto</Label>
                </label>

                <ProjectDialog
                  open={config.isProjectDialogOpen ?? false}
                  onOpenChange={onProjectDialogChange}
                  projects={projects}
                  selectedProjectId={config.projectId}
                  onProjectSelect={onProjectChange}
                  isLoading={loadingProjects}
                  disabled={loadingProjects}
                />
              </div>

              {/* Section 2: File Upload */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">2. Briefing</p>
                <label htmlFor={config.fileInputId}>
                  <div className="flex items-center justify-between gap-3">
                    <Label>Carica il file</Label>
                    {!config.projectId && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        Richiesto progetto
                      </span>
                    )}
                  </div>
                </label>
                <p className="text-xs text-muted-foreground">Formati supportati: .docx, .txt, .md</p>
                {!config.projectId && <p className="text-xs text-amber-700">Seleziona prima un progetto per abilitare il caricamento.</p>}

                <input
                  id={config.fileInputId}
                  type="file"
                  accept=".docx,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                  className="block min-h-11 w-full cursor-pointer rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none transition-colors file:mr-3 file:h-7 file:rounded-md file:border-0 file:bg-slate-100 file:px-3.5 file:text-xs file:font-medium focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 lg:w-2/3"
                  onChange={handleFileChange}
                  disabled={config.isUploadDisabled ?? false}
                />
              </div>

              {/* Section 3: Optional Settings */}
              <div className="pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">3. Opzioni facoltative</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {/* Model Selection */}
                  <div className="space-y-1.5">
                    <Label htmlFor="tool-model-select" className="text-xs font-medium text-slate-600">
                      Modello
                    </Label>
                    <Select value={config.model} onValueChange={onModelChange} disabled={loadingModels}>
                      <SelectTrigger id="tool-model-select" className="app-control" aria-label="Modello LLM">
                        <SelectValue placeholder="Seleziona modello" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tone Selection */}
                  <div className="space-y-1.5">
                    <Label htmlFor="tool-tone-select" className="text-xs font-medium text-slate-600">
                      Tono di voce
                    </Label>
                    <Select value={config.tone} onValueChange={onToneChange}>
                      <SelectTrigger id="tool-tone-select" className="app-control" aria-label="Tono di comunicazione">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tones.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item.charAt(0).toUpperCase() + item.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {toneHints?.[config.tone] && (
                      <p className="text-xs leading-relaxed text-muted-foreground">{toneHints[config.tone]}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Custom children (e.g., additional fields) */}
          {children}
        </div>

        {/* Notes field (shown when extraction is ready) */}
        {hasExtractionReady && (
          <div className="space-y-1.5">
            <label htmlFor="tool-notes" className="flex items-center justify-between gap-3">
              <Label>Note</Label>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                Opzionale
              </span>
            </label>
            <Textarea
              id="tool-notes"
              className="app-control"
              placeholder="Istruzioni extra (opzionale)"
              rows={3}
              value={config.notes}
              onChange={(event) => onNotesChange(event.target.value)}
            />
          </div>
        )}

        {/* Actions section */}
        <section className="space-y-4 border-t border-black/10 pt-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Azioni</p>

          <Button
            className="w-full"
            data-primary-action="true"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
          >
            {primaryAction.label}
          </Button>

          {secondaryActions && secondaryActions.length > 0 && (
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              {secondaryActions.map((action) => (
                <Button
                  key={action.label}
                  type="button"
                  variant="outline"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="sm:flex-1"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
