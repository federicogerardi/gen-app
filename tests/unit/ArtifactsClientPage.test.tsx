import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { ArtifactsClientPage } from '@/app/artifacts/ArtifactsClientPage';

const mockPush = jest.fn();
const mockUseArtifacts = jest.fn();
const mockUseDeleteArtifact = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/components/layout/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

jest.mock('@/components/hooks/useArtifacts', () => ({
  useArtifacts: (...args: unknown[]) => mockUseArtifacts(...args),
  useDeleteArtifact: (...args: unknown[]) => mockUseDeleteArtifact(...args),
}));

describe('ArtifactsClientPage', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockUseDeleteArtifact.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    });
  });

  it('orders artifacts by recency before rendering list cards', () => {
    mockUseArtifacts.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        items: [
          {
            id: 'art_old',
            projectId: 'p1',
            project: { id: 'p1', name: 'Progetto A' },
            type: 'content',
            workflowType: 'meta_ads',
            model: 'model-a',
            input: { product: 'Prodotto' },
            content: 'old',
            status: 'completed',
            inputTokens: 10,
            outputTokens: 20,
            createdAt: '2026-04-01T10:00:00.000Z',
            completedAt: '2026-04-01T10:05:00.000Z',
          },
          {
            id: 'art_new',
            projectId: 'p1',
            project: { id: 'p1', name: 'Progetto A' },
            type: 'content',
            workflowType: 'meta_ads',
            model: 'model-a',
            input: { product: 'Prodotto' },
            content: 'new',
            status: 'completed',
            inputTokens: 10,
            outputTokens: 20,
            createdAt: '2026-04-10T10:00:00.000Z',
            completedAt: '2026-04-10T10:05:00.000Z',
          },
        ],
      },
    });

    render(<ArtifactsClientPage projects={[]} />);

    const cards = screen.getAllByRole('listitem');
    const firstCardDetailButton = within(cards[0]).getByRole('button', { name: /Apri dettaglio/i });
    const secondCardDetailButton = within(cards[1]).getByRole('button', { name: /Apri dettaglio/i });

    expect(firstCardDetailButton).toHaveAccessibleName(expect.stringContaining('art_new'));
    expect(secondCardDetailButton).toHaveAccessibleName(expect.stringContaining('art_old'));
  });

  it('shows relaunch action only for artifacts with supported relaunch mapping', () => {
    mockUseArtifacts.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        items: [
          {
            id: 'art_meta',
            projectId: 'p1',
            project: { id: 'p1', name: 'Progetto A' },
            type: 'content',
            workflowType: 'meta_ads',
            model: 'model-a',
            input: {
              product: 'Prodotto',
              audience: 'Audience',
              offer: 'Offerta',
              objective: 'lead generation',
              tone: 'professional',
            },
            content: 'meta',
            status: 'completed',
            inputTokens: 10,
            outputTokens: 20,
            createdAt: '2026-04-10T10:00:00.000Z',
            completedAt: '2026-04-10T10:05:00.000Z',
          },
          {
            id: 'art_unknown',
            projectId: 'p1',
            project: { id: 'p1', name: 'Progetto A' },
            type: 'content',
            workflowType: 'unknown_workflow',
            model: 'model-a',
            input: {},
            content: 'unknown',
            status: 'completed',
            inputTokens: 10,
            outputTokens: 20,
            createdAt: '2026-04-01T10:00:00.000Z',
            completedAt: '2026-04-01T10:05:00.000Z',
          },
        ],
      },
    });

    render(<ArtifactsClientPage projects={[]} />);

    expect(screen.getAllByRole('button', { name: /Rigenera variante da artefatto/ })).toHaveLength(1);
  });
});