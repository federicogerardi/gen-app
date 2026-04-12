import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Navbar } from '@/components/layout/Navbar';

const mockUsePathname = jest.fn();
const mockUseSession = jest.fn();
const mockSignOut = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

describe('Navbar', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard');
    mockUseSession.mockReturnValue({
      data: {
        user: {
          email: 'user@example.com',
          role: 'user',
        },
      },
    });
    mockSignOut.mockReset();
  });

  it('shows Projects as a primary navigation entry and renames artifacts to Storico', () => {
    render(<Navbar />);

    expect(screen.getByRole('link', { name: 'Progetti' })).toHaveAttribute('href', '/dashboard/projects');
    expect(screen.getByRole('link', { name: 'Storico' })).toHaveAttribute('href', '/artifacts');
  });

  it('marks Projects as active on project routes', () => {
    mockUsePathname.mockReturnValue('/dashboard/projects/proj_1');
    render(<Navbar />);

    expect(screen.getByRole('link', { name: 'Progetti' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current', 'page');
  });

  it('opens the mobile menu with the same primary information architecture', () => {
    render(<Navbar />);

    fireEvent.click(screen.getByRole('button', { name: 'Apri menu' }));

    const mobileMenu = screen
      .getAllByRole('list', { name: 'Sezioni applicazione' })
      .find((element) => element.id === 'mobile-menu');

    expect(mobileMenu).toBeDefined();

    const mobileNavigation = within(mobileMenu as HTMLElement);
    expect(mobileNavigation.getByRole('link', { name: 'Progetti' })).toHaveAttribute('href', '/dashboard/projects');
    expect(mobileNavigation.getByRole('link', { name: 'Storico' })).toHaveAttribute('href', '/artifacts');
  });
});