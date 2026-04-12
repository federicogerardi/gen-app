import React from 'react';
import { render, screen } from '@testing-library/react';
import { PageShell } from '@/components/layout/PageShell';

jest.mock('@/components/layout/Navbar', () => ({
  Navbar: () => <nav data-testid="mock-navbar" />,
}));

describe('PageShell', () => {
  it('renders Navbar', () => {
    render(<PageShell>content</PageShell>);
    expect(screen.getByTestId('mock-navbar')).toBeInTheDocument();
  });

  it('renders children inside main#main-content', () => {
    render(<PageShell><span data-testid="child">hello</span></PageShell>);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toContainElement(screen.getByTestId('child'));
  });

  it('applies workspace width by default', () => {
    render(<PageShell>x</PageShell>);
    expect(screen.getByRole('main')).toHaveClass('max-w-[76rem]');
  });

  it('applies form width when requested', () => {
    render(<PageShell width="form">x</PageShell>);
    expect(screen.getByRole('main')).toHaveClass('max-w-[44rem]');
  });

  it('applies reading width when requested', () => {
    render(<PageShell width="reading">x</PageShell>);
    expect(screen.getByRole('main')).toHaveClass('max-w-[68rem]');
  });

  it('renders app-grid-overlay inside main', () => {
    const { container } = render(<PageShell>x</PageShell>);
    const overlay = container.querySelector('.app-grid-overlay');
    expect(overlay).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(overlay as HTMLElement);
  });

  it('main carries required shell classes', () => {
    render(<PageShell>x</PageShell>);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('app-shell', 'app-copy', 'flex-1', 'p-6');
  });
});