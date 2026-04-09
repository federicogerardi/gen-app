import type { ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminQuotaForm } from '@/app/admin/AdminQuotaForm';

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('AdminQuotaForm', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('disabilita il salvataggio se i valori non sono cambiati', () => {
    renderWithQueryClient(
      <AdminQuotaForm userId="u1" currentQuota={100} currentBudget={250} />,
    );

    expect(screen.getByRole('button', { name: 'Salva' })).toBeDisabled();
  });

  it('salva quota e budget aggiornati con feedback positivo', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    renderWithQueryClient(
      <AdminQuotaForm userId="u1" currentQuota={100} currentBudget={250} />,
    );

    fireEvent.change(screen.getByLabelText('Quota mensile'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('Budget ($)'), { target: { value: '300' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salva' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/users/u1/quota', expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      }));
    });

    expect(screen.getByText('Quota e budget aggiornati con successo.')).toBeInTheDocument();
  });

  it('mostra errore di validazione se la quota non e valida', () => {
    renderWithQueryClient(
      <AdminQuotaForm userId="u1" currentQuota={100} currentBudget={250} />,
    );

    fireEvent.change(screen.getByLabelText('Quota mensile'), { target: { value: '0' } });

    expect(screen.getByRole('button', { name: 'Salva' })).toBeDisabled();
  });

  it('azzera l utilizzo e mostra feedback positivo', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    renderWithQueryClient(
      <AdminQuotaForm userId="u1" currentQuota={100} currentBudget={250} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Azzera utilizzo' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/users/u1/quota', expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      }));
    });

    expect(screen.getByText('Utilizzo mensile azzerato.')).toBeInTheDocument();
  });
});