import { fireEvent, render, screen } from '@testing-library/react';
import { StatusChecklist } from '@/tools/shared/components/StatusChecklist';

describe('StatusChecklist', () => {
  it('renderizza items e messaggio errore in modalita non collassabile', () => {
    render(
      <StatusChecklist
        isCollapsible={false}
        items={[
          { id: '1', label: 'Upload', status: 'done' },
          { id: '2', label: 'Extraction', status: 'error', errorMessage: 'Timeout provider' },
        ]}
      />
    );

    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Pronto')).toBeInTheDocument();
    expect(screen.getByText('Extraction')).toBeInTheDocument();
    expect(screen.getByText('Bloccato')).toBeInTheDocument();
    expect(screen.getByText('Timeout provider')).toBeInTheDocument();
  });

  it('in modalita collassabile propaga onToggle', () => {
    const onToggle = jest.fn();
    const { container } = render(
      <StatusChecklist
        isCollapsible
        isOpen
        onToggle={onToggle}
        items={[{ id: '1', label: 'Generate', status: 'active' }]}
      />
    );

    const details = container.querySelector('details');
    expect(details).not.toBeNull();

    if (details) {
      details.open = false;
      fireEvent(details, new Event('toggle'));
    }

    expect(onToggle).toHaveBeenCalled();
  });
});
