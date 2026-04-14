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

    expect(screen.getByText('Trend personale generazioni')).toBeInTheDocument();
    expect(screen.getByText('Legenda')).toBeInTheDocument();
    expect(screen.getByText('Picco periodo: 30')).toBeInTheDocument();
    expect(screen.getByText('Media giornaliera: 27,0')).toBeInTheDocument();
    expect(screen.getByText('Totale periodo')).toBeInTheDocument();
    expect(screen.getByText('189')).toBeInTheDocument();
    expect(screen.getByText('24/01')).toBeInTheDocument();
    expect(screen.getByText('30/01')).toBeInTheDocument();
  });

  it('updates metrics when switching from 7d to 30d', () => {
    render(<PersonalTrendCard points30d={buildPoints30d()} />);

    fireEvent.click(screen.getByRole('button', { name: '30d' }));

    expect(screen.getByText('Picco periodo: 30')).toBeInTheDocument();
    expect(screen.getByText('Media giornaliera: 15,5')).toBeInTheDocument();
    expect(screen.getByText('465')).toBeInTheDocument();
    expect(screen.getByText('01/01')).toBeInTheDocument();
    expect(screen.getByText('30/01')).toBeInTheDocument();
  });
});