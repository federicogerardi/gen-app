import { fireEvent, render, screen } from '@testing-library/react';
import { StepCard } from '@/tools/shared/components/StepCard';

describe('StepCard', () => {
  it('mostra titolo, badge e preview troncata con azioni', () => {
    const onViewClick = jest.fn();
    const onRegenerateClick = jest.fn();
    const longContent = 'a'.repeat(600);

    render(
      <StepCard
        step={{
          key: 'landing',
          title: 'Landing',
          status: 'done',
          content: longContent,
          artifactId: 'art_1',
          error: null,
        }}
        statusLabel={{ done: 'Completato' }}
        statusBadgeClass={{ done: 'badge-class' }}
        onViewClick={onViewClick}
        onRegenerateClick={onRegenerateClick}
      />
    );

    expect(screen.getByText('Landing')).toBeInTheDocument();
    expect(screen.getByText('Completato')).toBeInTheDocument();
    expect(screen.getByText(/a+\.\.\.$/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Visualizza' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rigenera' }));

    expect(onViewClick).toHaveBeenCalled();
    expect(onRegenerateClick).toHaveBeenCalled();
  });

  it('disabilita rigenera in caso di errore step', () => {
    render(
      <StepCard
        step={{
          key: 'thank_you',
          title: 'Thank You',
          status: 'error',
          content: '',
          artifactId: null,
          error: 'Errore stream',
        }}
        statusLabel={{ error: 'Errore' }}
        statusBadgeClass={{ error: 'badge-class' }}
        onRegenerateClick={jest.fn()}
      />
    );

    expect(screen.getByText('Errore stream')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rigenera' })).toBeDisabled();
  });
});
