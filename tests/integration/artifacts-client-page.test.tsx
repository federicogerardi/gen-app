import { fireEvent, render, screen } from '@testing-library/react';
import { ArtifactsClientPage } from '@/app/artifacts/ArtifactsClientPage';

const pushMock = jest.fn();
const mutateAsyncMock = jest.fn().mockResolvedValue(undefined);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('@/components/layout/Navbar', () => ({
  Navbar: () => <div data-testid="navbar" />,
}));

jest.mock('@/components/hooks/useArtifacts', () => ({
  useArtifacts: jest.fn(),
  useDeleteArtifact: jest.fn(),
}));

const { useArtifacts, useDeleteArtifact } = jest.requireMock('@/components/hooks/useArtifacts') as {
  useArtifacts: jest.Mock;
  useDeleteArtifact: jest.Mock;
};

const baseArtifact = {
  id: 'art_1',
  projectId: 'proj_1',
  project: { id: 'proj_1', name: 'Project A' },
  type: 'content',
  model: 'openai/gpt-4-turbo',
  input: {},
  content: 'Output di test',
  status: 'completed',
  inputTokens: 10,
  outputTokens: 20,
  createdAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
};

describe('ArtifactsClientPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    mutateAsyncMock.mockClear();
    useDeleteArtifact.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    });
  });

  it('mostra stato di caricamento', () => {
    useArtifacts.mockReturnValue({ isLoading: true, error: null, data: null });

    render(<ArtifactsClientPage projects={[]} />);

    expect(screen.getByText('Caricamento artefatti...')).toBeInTheDocument();
  });

  it('mostra quick actions e consente eliminazione', async () => {
    useArtifacts.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        items: [baseArtifact],
        total: 1,
        limit: 100,
        offset: 0,
      },
    });

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ArtifactsClientPage projects={[{ id: 'proj_1', name: 'Project A' }]} />);

    expect(screen.queryByText('Output di test')).not.toBeInTheDocument();
    expect(screen.getByText('Project A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apri dettaglio artefatto/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Duplica input' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Elimina artefatto/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(mutateAsyncMock).toHaveBeenCalledWith('art_1');

    confirmSpy.mockRestore();
  });

  it('non mostra preview raw o semantica nel listing', () => {
    useArtifacts.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        items: [
          {
            ...baseArtifact,
            content: JSON.stringify({
              headline: 'Titolo persuasivo',
              primaryText: 'Descrizione leggibile',
              cta: 'Scopri di piu',
            }),
          },
        ],
        total: 1,
        limit: 100,
        offset: 0,
      },
    });

    render(<ArtifactsClientPage projects={[{ id: 'proj_1', name: 'Project A' }]} />);

    expect(screen.queryByText('Titolo persuasivo - Descrizione leggibile - Scopri di piu')).not.toBeInTheDocument();
    expect(screen.queryByText('{"headline":"Titolo persuasivo","primaryText":"Descrizione leggibile","cta":"Scopri di piu"}')).not.toBeInTheDocument();
  });
});
