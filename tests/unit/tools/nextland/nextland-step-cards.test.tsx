import { fireEvent, render, screen } from '@testing-library/react';
import { NextLandStepCards } from '@/app/tools/nextland/components/NextLandStepCards';
import type { NextLandStepState } from '@/app/tools/nextland/types';

describe('NextLandStepCards', () => {
  it('renderizza badge stato, contenuto ed errore', () => {
    const steps: NextLandStepState[] = [
      {
        key: 'landing',
        title: 'Step 1 - Landing Page',
        status: 'running',
        content: '',
        artifactId: null,
        error: null,
      },
      {
        key: 'thank_you',
        title: 'Step 2 - Thank-you Page',
        status: 'error',
        content: '',
        artifactId: null,
        error: 'Errore di generazione',
      },
    ];

    render(<NextLandStepCards steps={steps} onOpenArtifact={jest.fn()} />);

    expect(screen.getByText('In corso')).toBeInTheDocument();
    expect(screen.getByText('Errore')).toBeInTheDocument();
    expect(screen.getByText('Errore di generazione')).toBeInTheDocument();
  });

  it('chiama onOpenArtifact quando presente artifactId', () => {
    const onOpenArtifact = jest.fn();
    const steps: NextLandStepState[] = [
      {
        key: 'landing',
        title: 'Step 1 - Landing Page',
        status: 'done',
        content: 'Contenuto landing',
        artifactId: 'art_1',
        error: null,
      },
      {
        key: 'thank_you',
        title: 'Step 2 - Thank-you Page',
        status: 'idle',
        content: '',
        artifactId: null,
        error: null,
      },
    ];

    render(<NextLandStepCards steps={steps} onOpenArtifact={onOpenArtifact} />);

    fireEvent.click(screen.getByRole('button', { name: 'Apri artefatto' }));
    expect(onOpenArtifact).toHaveBeenCalledWith('art_1');
  });
});
