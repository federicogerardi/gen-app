import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Navbar } from '@/components/layout/Navbar';

const mockUsePathname = jest.fn();
const mockUseSession = jest.fn();
const mockSignOut = jest.fn();
const mockUseRuntimeInfo = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

jest.mock('@/components/layout/RuntimeInfoProvider', () => ({
  useRuntimeInfo: () => mockUseRuntimeInfo(),
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
    mockUseRuntimeInfo.mockReturnValue({
      channel: 'development',
      channelLabel: 'DEV',
      appVersion: '0.1.0',
      versionLabel: 'v0.1.0',
      isNonProduction: true,
    });
    mockSignOut.mockReset();
  });

  it('shows Projects as a primary navigation entry and renames artifacts to Storico', () => {
    render(<Navbar />);

    expect(screen.getByRole('link', { name: 'Progetti' })).toHaveAttribute('href', '/dashboard/projects');
    expect(screen.getByRole('link', { name: 'Storico' })).toHaveAttribute('href', '/artifacts');
  });

  it('shows only Funnel Pages inside tools navigation', () => {
    render(<Navbar />);

    const desktopNavigation = screen.getAllByRole('list', { name: 'Sezioni applicazione' })[0];
    fireEvent.click(within(desktopNavigation).getByText('Tools'));

    expect(screen.getByRole('link', { name: 'Funnel Pages' })).toHaveAttribute('href', '/tools/funnel-pages');
    expect(screen.queryByRole('link', { name: 'Meta Ads' })).not.toBeInTheDocument();
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
    const mobileBadge = mobileNavigation.getByTestId('runtime-status-badge');
    expect(mobileBadge).toHaveTextContent('DEV');
    expect(mobileBadge).toHaveTextContent('v0.1.0');
    expect(mobileNavigation.getByRole('link', { name: 'Progetti' })).toHaveAttribute('href', '/dashboard/projects');
    expect(mobileNavigation.getByRole('link', { name: 'Storico' })).toHaveAttribute('href', '/artifacts');

    fireEvent.click(mobileNavigation.getByText('Tools'));
    expect(mobileNavigation.getByRole('link', { name: 'Funnel Pages' })).toHaveAttribute('href', '/tools/funnel-pages');
    expect(mobileNavigation.queryByRole('link', { name: 'Meta Ads' })).not.toBeInTheDocument();
  });

  it('shows textual runtime label in desktop user area for non-production', () => {
    render(<Navbar />);

    const badge = screen.getAllByTestId('runtime-status-badge')[0];
    expect(badge).toHaveTextContent('DEV');
    expect(badge).toHaveTextContent('v0.1.0');
    expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Ambiente DEV'));
    expect(badge).toHaveAttribute('aria-label', expect.stringContaining('v0.1.0'));
  });

  it('shows production runtime label in navbar chrome', () => {
    mockUseRuntimeInfo.mockReturnValue({
      channel: 'production',
      channelLabel: 'PROD',
      appVersion: '1.2.3',
      versionLabel: 'v1.2.3',
      isNonProduction: false,
    });

    render(<Navbar />);

    const badge = screen.getByTestId('runtime-status-badge');
    expect(badge).toHaveTextContent('PROD');
    expect(badge).toHaveTextContent('v1.2.3');
  });

  it('shows preview textual runtime label in desktop and mobile menu', () => {
    mockUseRuntimeInfo.mockReturnValue({
      channel: 'preview',
      channelLabel: 'PREVIEW',
      appVersion: '1.5.0-rc.2',
      versionLabel: 'v1.5.0-rc.2',
      isNonProduction: true,
    });

    render(<Navbar />);

    const desktopBadge = screen.getByTestId('runtime-status-badge');
    expect(desktopBadge).toHaveTextContent('PREVIEW');
    expect(desktopBadge).toHaveTextContent('v1.5.0-rc.2');

    fireEvent.click(screen.getByRole('button', { name: 'Apri menu' }));
    const mobileMenu = screen
      .getAllByRole('list', { name: 'Sezioni applicazione' })
      .find((element) => element.id === 'mobile-menu');

    expect(mobileMenu).toBeDefined();
    const mobileNavigation = within(mobileMenu as HTMLElement);
    const mobileBadge = mobileNavigation.getByTestId('runtime-status-badge');
    expect(mobileBadge).toHaveTextContent('PREVIEW');
    expect(mobileBadge).toHaveTextContent('v1.5.0-rc.2');
  });
});