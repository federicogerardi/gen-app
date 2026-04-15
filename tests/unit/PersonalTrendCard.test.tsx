import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PersonalTrendCard } from '@/app/dashboard/PersonalTrendCard';

type TrendPoint = {
  date: string;
  count: number;
};

function buildPoints30d(): TrendPoint[] {
  return Array.from({ length: 30 }, (_, index) => ({
    date: `2026-01-${String(index + 1).padStart(2, '0')}`,
    count: index + 1,
  }));
}

describe('PersonalTrendCard', () => {
  it('shows legend and Italian formatted average on default 7d period', () => {
    render(<PersonalTrendCard points30d={buildPoints30d()} />);

    expect(screen.getByRole('button', { name: '7d' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('img', { name: /Andamento generazioni personali 7d/i })).toBeInTheDocument();

    // Totale 7d: 24+25+26+27+28+29+30 = 189
    expect(screen.getByText(/Totale periodo/i)).toBeInTheDocument();
    expect(screen.getByText('189')).toBeInTheDocument();

    // Invarianti del blocco legenda: picco e media italiana per 7d
    expect(screen.getByText(/Picco periodo:/i)).toHaveTextContent('30');
    expect(screen.getByText(/Media giornaliera:/i)).toHaveTextContent('27,0');

    // Asse temporale 7d dal 24/01 al 30/01
    expect(screen.getByText('24/01')).toBeInTheDocument();
    expect(screen.getByText('30/01')).toBeInTheDocument();
  });

  it('updates metrics when switching from 7d to 30d', () => {
    render(<PersonalTrendCard points30d={buildPoints30d()} />);

    fireEvent.click(screen.getByRole('button', { name: '30d' }));

    expect(screen.getByRole('button', { name: '7d' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: /Andamento generazioni personali 30d/i })).toBeInTheDocument();

    expect(screen.getByText(/Picco periodo:/i)).toHaveTextContent('30');
    expect(screen.getByText(/Media giornaliera:/i)).toHaveTextContent('15,5');
    expect(screen.getByText('465')).toBeInTheDocument();
    expect(screen.getByText('01/01')).toBeInTheDocument();
    expect(screen.getByText('30/01')).toBeInTheDocument();
  });
});