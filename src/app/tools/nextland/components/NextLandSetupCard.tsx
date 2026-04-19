'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TONES, TONE_HINTS } from '../config';

type ProjectOption = { id: string; name: string };
type ModelOption = { id: string; name: string; default?: boolean };

type FieldLabelProps = {
  htmlFor?: string;
  required?: boolean;
  children: string;
};

function FieldLabel({ htmlFor, required = true, children }: FieldLabelProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={htmlFor}>{children}</Label>
      {!required && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          Opzionale
        </span>
      )}
    </div>
  );
}

function formatToneLabel(tone: (typeof TONES)[number]) {
  return tone.charAt(0).toUpperCase() + tone.slice(1);
}

export interface NextLandSetupCardProps {
  selectedProject: ProjectOption | null;
  projectId: string;
  projects: ProjectOption[];
  models: ModelOption[];
  model: string;
  tone: (typeof TONES)[number];
  notes: string;
  hasExtractionReady: boolean;
  phase: 'idle' | 'uploading' | 'extracting' | 'review' | 'generating';
  running: boolean;
  primaryAction: { label: string; disabled: boolean; onClick?: () => void };
  secondaryActions: Array<{ label: string; onClick: () => void; disabled?: boolean }>;
  isProjectDialogOpen: boolean;
  setIsProjectDialogOpen: (open: boolean) => void;
  onProjectChange: (projectId: string) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onModelChange: (modelId: string) => void;
  onToneChange: (tone: (typeof TONES)[number]) => void;
  onNotesChange: (notes: string) => void;
}

export function NextLandSetupCard({
  selectedProject,
  projectId,
  projects,
  models,
  model,
  tone,
  notes,
  hasExtractionReady,
  phase,
  running,
  primaryAction,
  secondaryActions,
  isProjectDialogOpen,
  setIsProjectDialogOpen,
  onProjectChange,
  onFileChange,
  onModelChange,
  onToneChange,
  onNotesChange,
}: NextLandSetupCardProps) {
  return (
    <Card className="app-surface app-rise rounded-3xl">
      <CardHeader>
        <CardTitle className="text-base">Setup</CardTitle>
        <CardDescription>Completa i campi essenziali.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-6">
          <section className="space-y-4">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">1. Progetto</p>
                <FieldLabel>Seleziona il progetto</FieldLabel>
                <Dialog.Root open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
                  <Dialog.Trigger asChild>
                    <Button
                      className="h-11 w-full min-w-0 cursor-pointer justify-start overflow-hidden px-3 text-left lg:w-2/3"
                      variant="outline"
                      title={selectedProject?.name ?? undefined}
                    >
                      {selectedProject ? (
                        <span className="block min-w-0 flex-1 truncate">{selectedProject.name}</span>
                      ) : (
                        <span className="block min-w-0 flex-1 truncate text-muted-foreground">Scegli un progetto</span>
                      )}
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-96 w-96 -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-black/10 bg-white p-6 shadow-lg">
                      <Dialog.Title className="mb-4 text-lg font-semibold">Scegli un progetto</Dialog.Title>
                      <Dialog.Description className="sr-only">Elenco progetti disponibili per NextLand</Dialog.Description>
                      <div className="space-y-2">
                        {projects.length ? (
                          projects.map((project) => (
                            <button
                              key={project.id}
                              onClick={() => {
                                onProjectChange(project.id);
                                setIsProjectDialogOpen(false);
                              }}
                              className={`w-full cursor-pointer rounded-lg border px-3 py-2 text-left transition-colors ${
                                projectId === project.id
                                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                                  : 'border-transparent hover:bg-slate-100'
                              }`}
                            >
                              <span className="font-medium">{project.name}</span>
                            </button>
                          ))
                        ) : (
                          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-600">
                            Nessun progetto disponibile. Crea un progetto prima di usare NextLand.
                          </p>
                        )}
                      </div>
                      <Dialog.Close asChild>
                        <button className="absolute right-4 top-4 cursor-pointer text-muted-foreground hover:text-foreground">x</button>
                      </Dialog.Close>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">2. Briefing</p>
                <FieldLabel htmlFor="nextland-file-input">Carica il file</FieldLabel>
                <p className="text-xs text-muted-foreground">Formati supportati: .docx, .txt, .md</p>
                {!projectId && (
                  <p className="text-xs text-amber-700">Seleziona prima un progetto per abilitare il caricamento.</p>
                )}
                <input
                  id="nextland-file-input"
                  type="file"
                  accept=".docx,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                  className="block min-h-11 w-full cursor-pointer rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none transition-colors file:mr-3 file:h-7 file:rounded-md file:border-0 file:bg-slate-100 file:px-3.5 file:text-xs file:font-medium focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 lg:w-2/3"
                  onChange={onFileChange}
                  disabled={phase === 'uploading' || phase === 'extracting' || running || !projectId}
                />
              </div>
            </div>

            <div className="pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">3. Opzioni facoltative</p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nextland-model-select" className="text-xs font-medium text-slate-600">Modello</Label>
                  <Select value={model} onValueChange={onModelChange}>
                    <SelectTrigger id="nextland-model-select" className="app-control" aria-label="Modello LLM">
                      <SelectValue placeholder="Seleziona modello" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nextland-tone-select" className="text-xs font-medium text-slate-600">Tono di voce</Label>
                  <Select value={tone} onValueChange={(value) => onToneChange(value as (typeof TONES)[number])}>
                    <SelectTrigger id="nextland-tone-select" className="app-control" aria-label="Tono di comunicazione">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map((item) => (
                        <SelectItem key={item} value={item}>{formatToneLabel(item)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-relaxed text-muted-foreground">{TONE_HINTS[tone]}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {hasExtractionReady && (
          <div className="space-y-1.5">
            <FieldLabel htmlFor="nextland-notes" required={false}>Note</FieldLabel>
            <Textarea
              id="nextland-notes"
              className="app-control"
              placeholder="Istruzioni extra (opzionale)"
              rows={3}
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
            />
          </div>
        )}

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

          {secondaryActions.length > 0 && (
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