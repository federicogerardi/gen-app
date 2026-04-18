import { fireEvent, render, screen } from '@testing-library/react';
import { NextLandSetupCard } from '@/app/tools/nextland/components/NextLandSetupCard';

describe('NextLandSetupCard', () => {
  it('mostra warning quando il progetto non e selezionato e disabilita upload', () => {
    render(
      <NextLandSetupCard
        selectedProject={null}
        projectId=""
        projects={[]}
        models={[{ id: 'openai/gpt-4.1', name: 'GPT-4.1', default: true }]}
        model="openai/gpt-4.1"
        tone="professional"
        notes=""
        hasExtractionReady={false}
        phase="idle"
        running={false}
        primaryAction={{ label: 'Completa dati obbligatori', disabled: true }}
        secondaryActions={[]}
        isProjectDialogOpen={false}
        setIsProjectDialogOpen={jest.fn()}
        onProjectChange={jest.fn()}
        onFileChange={jest.fn()}
        onModelChange={jest.fn()}
        onToneChange={jest.fn()}
        onNotesChange={jest.fn()}
      />
    );

    expect(screen.getByText('Seleziona prima un progetto per abilitare il caricamento.')).toBeInTheDocument();
    expect(screen.getByLabelText('Carica il file')).toBeDisabled();
  });

  it('esegue primary action e mostra note quando extraction e pronta', () => {
    const onPrimaryAction = jest.fn();
    const onNotesChange = jest.fn();

    render(
      <NextLandSetupCard
        selectedProject={{ id: 'proj_1', name: 'Project A' }}
        projectId="proj_1"
        projects={[{ id: 'proj_1', name: 'Project A' }]}
        models={[{ id: 'openai/gpt-4.1', name: 'GPT-4.1', default: true }]}
        model="openai/gpt-4.1"
        tone="professional"
        notes=""
        hasExtractionReady
        phase="idle"
        running={false}
        primaryAction={{ label: 'Avvia generazione NextLand', disabled: false, onClick: onPrimaryAction }}
        secondaryActions={[]}
        isProjectDialogOpen={false}
        setIsProjectDialogOpen={jest.fn()}
        onProjectChange={jest.fn()}
        onFileChange={jest.fn()}
        onModelChange={jest.fn()}
        onToneChange={jest.fn()}
        onNotesChange={onNotesChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Avvia generazione NextLand' }));
    expect(onPrimaryAction).toHaveBeenCalled();

    const notes = screen.getByLabelText('Note') as HTMLTextAreaElement;
    fireEvent.change(notes, { target: { value: 'Nuove note' } });
    expect(onNotesChange).toHaveBeenCalledWith('Nuove note');
  });
});
