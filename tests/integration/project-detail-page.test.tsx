import { render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import type { Session } from 'next-auth';
import ProjectPage from '@/app/dashboard/projects/[id]/page';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

jest.mock('@/components/layout/PageShell', () => ({
  PageShell: ({ children }: { children: ReactNode }) => <div data-testid="page-shell">{children}</div>,
}));

const redirectMock = jest.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

const notFoundMock = jest.fn(() => {
  throw new Error('NOT_FOUND');
});

jest.mock('next/navigation', () => ({
  redirect: (url: string) => redirectMock(url),
  notFound: () => notFoundMock(),
}));

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));

jest.mock('@/lib/db', () => ({
  db: {
    project: {
      findUnique: jest.fn(),
    },
  },
}));

const authMock = auth as jest.MockedFunction<typeof auth>;
const findUniqueMock = db.project.findUnique as jest.Mock;

type MockSession = Session | null;
type AuthSessionMock = jest.Mock<Promise<MockSession>, []>;

function mockAuthSession(session: MockSession) {
  (authMock as unknown as AuthSessionMock).mockResolvedValue(session);
}

describe('Project detail page', () => {
  beforeEach(() => {
    redirectMock.mockClear();
    notFoundMock.mockClear();
    authMock.mockReset();
    findUniqueMock.mockReset();
  });

  it('renders artifact card identity title/subtitle and hides raw preview', async () => {
    mockAuthSession({
      user: {
        id: 'user_1',
        role: 'user',
      },
    } as Session);

    findUniqueMock.mockResolvedValue({
      id: 'proj_1',
      userId: 'user_1',
      name: 'Project A',
      description: 'Descrizione test',
      createdAt: new Date('2026-04-13T10:00:00.000Z'),
      updatedAt: new Date('2026-04-13T11:00:00.000Z'),
      artifacts: [
        {
          id: 'art_abcdef123456',
          type: 'content',
          workflowType: 'meta_ads',
          model: 'openai/gpt-4-turbo',
          status: 'completed',
          input: {
            topic: 'lead b2b',
            tone: 'professional',
          },
          content: 'Output da non mostrare in card',
          createdAt: new Date('2026-04-13T12:00:00.000Z'),
        },
      ],
    });

    const ui = (await ProjectPage({
      params: Promise.resolve({ id: 'proj_1' }),
    })) as ReactElement;

    render(ui);

    expect(screen.getByText('Meta Ads • Lead b2b')).toBeInTheDocument();
    expect(screen.getByText('Tono: professional · ID 123456')).toBeInTheDocument();
    expect(screen.queryByText('Output da non mostrare in card')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Apri dettaglio' })).toBeInTheDocument();
  });

  it('redirects to home when the session is missing', async () => {
    mockAuthSession(null);

    await expect(
      ProjectPage({
        params: Promise.resolve({ id: 'proj_1' }),
      })
    ).rejects.toThrow('REDIRECT:/');

    expect(redirectMock).toHaveBeenCalledWith('/');
  });

  it('returns not found when project ownership does not match user', async () => {
    mockAuthSession({
      user: {
        id: 'user_1',
        role: 'user',
      },
    } as Session);

    findUniqueMock.mockResolvedValue({
      id: 'proj_1',
      userId: 'user_2',
      name: 'Project A',
      description: null,
      createdAt: new Date('2026-04-13T10:00:00.000Z'),
      updatedAt: new Date('2026-04-13T11:00:00.000Z'),
      artifacts: [],
    });

    await expect(
      ProjectPage({
        params: Promise.resolve({ id: 'proj_1' }),
      })
    ).rejects.toThrow('NOT_FOUND');

    expect(notFoundMock).toHaveBeenCalled();
  });
});