'use client';

import { useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';

export interface ProjectOption {
  id: string;
  name: string;
}

export interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectOption[];
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string) => void;
  triggerLabel?: string;
  emptyStateText?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

/**
 * ProjectDialog — Reusable project selector component
 * - Generic project list rendering
 * - Single selection with visual feedback
 * - Customizable labels and empty state
 */
export function ProjectDialog({
  open,
  onOpenChange,
  projects,
  selectedProjectId,
  onProjectSelect,
  triggerLabel = 'Scegli un progetto',
  emptyStateText = 'Nessun progetto disponibile. Crea un progetto prima di usare questo tool.',
  isLoading = false,
  disabled = false,
}: ProjectDialogProps) {
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleProjectClick = useCallback(
    (projectId: string) => {
      onProjectSelect(projectId);
      onOpenChange(false);
    },
    [onProjectSelect, onOpenChange],
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <Button
          className="h-11 w-full min-w-0 cursor-pointer justify-start overflow-hidden px-3 text-left lg:w-2/3"
          variant="outline"
          disabled={disabled}
          title={selectedProject?.name ?? undefined}
        >
          {selectedProject ? (
            <span className="block min-w-0 flex-1 truncate">{selectedProject.name}</span>
          ) : (
            <span className="block min-w-0 flex-1 truncate text-muted-foreground">{triggerLabel}</span>
          )}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-96 max-h-96 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-black/10 bg-white p-6 shadow-lg overflow-y-auto">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-lg font-semibold">Scegli un progetto</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Chiudi" className="cursor-pointer text-muted-foreground hover:text-foreground text-lg">✕</button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Elenco progetti disponibili</Dialog.Description>

          <div className="mt-4 space-y-2">
            {isLoading ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">Caricamento...</div>
            ) : projects.length > 0 ? (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                   type="button"
                  className={`w-full cursor-pointer px-3 py-2 text-left rounded-lg border transition-colors ${
                    selectedProjectId === project.id
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-transparent hover:bg-slate-100'
                  }`}
                >
                  <span className="font-medium">{project.name}</span>
                </button>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-600">
                {emptyStateText}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
