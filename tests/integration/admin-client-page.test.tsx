import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminClientPage } from '@/app/admin/AdminClientPage';

jest.mock('@/components/layout/Navbar', () => ({
  Navbar: () => <div data-testid="navbar" />,
}));

jest.mock('@/app/admin/AdminQuotaForm', () => ({
  AdminQuotaForm: () => <div data-testid="admin-quota-form">quota-form</div>,
}));

const users = [
  {
    id: 'u1',
    name: 'Mario Rossi',
    email: 'mario@example.com',
    role: 'user',
    monthlyQuota: 100,
    monthlyUsed: 20,
    monthlyBudget: 500,
    monthlySpent: 50,
    resetDate: new Date().toISOString(),
  },
  {
    id: 'u2',
    name: 'Giulia Bianchi',
    email: 'giulia@example.com',
    role: 'admin',
    monthlyQuota: 100,
    monthlyUsed: 95,
    monthlyBudget: 500,
    monthlySpent: 490,
    resetDate: new Date().toISOString(),
  },
];

const recentActivity = [
  {
    id: 'a1',
    artifactType: 'content',
    model: 'openai/gpt-4-turbo',
    status: 'success',
    costUSD: 0.021,
    createdAt: new Date().toISOString(),
    user: {
      email: 'mario@example.com',
      name: 'Mario Rossi',
    },
  },
];

const baselineMetrics = {
  generatedAt: new Date().toISOString(),
  completionRate: 0.9,
  avgCompletionSeconds: 65,
  p95CompletionSeconds: 120,
  requestSuccessRate30d: 0.92,
  requestErrorRate30d: 0.05,
  requestRateLimitedRate30d: 0.03,
  sampleSizeArtifacts: 100,
  sampleSizeRequests30d: 250,
};

const models = [
  {
    id: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    default: true,
  },
];

// Mock fetch for API pagination
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = jest.fn((url: any) => {
  if (typeof url === 'string' && url.includes('/api/admin/users')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          users,
          total: users.length,
          limit: 20,
          offset: 0,
          hasMore: false,
        }),
    });
  }
  if (typeof url === 'string' && url.includes('/api/admin/models')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          models,
        }),
    });
  }
  return Promise.reject(new Error('Unhandled fetch call'));
});

describe('AdminClientPage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('mostra metriche baseline e filtra utenti', async () => {
    render(
      <AdminClientPage
        totalUsers={users.length}
        totalArtifacts={120}
        completedArtifacts={108}
        recentActivity={recentActivity}
        baselineMetrics={baselineMetrics}
      />,
    );

    expect(screen.getByText('Metriche baseline (30 giorni)')).toBeInTheDocument();

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('Mario Rossi')).toBeInTheDocument();
    });

    expect(screen.getByText('90%')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Cerca utente'), { target: { value: 'Giulia' } });

    expect(screen.getByText('Giulia Bianchi')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Gestisci quota' })).toHaveLength(1);
  });

  it('apre il drawer di gestione quota', async () => {
    render(
      <AdminClientPage
        totalUsers={users.length}
        totalArtifacts={120}
        completedArtifacts={108}
        recentActivity={recentActivity}
        baselineMetrics={baselineMetrics}
      />,
    );

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('Mario Rossi')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Gestisci quota' })[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('admin-quota-form')).toBeInTheDocument();
  });
});
