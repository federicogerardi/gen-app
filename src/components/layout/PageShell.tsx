import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { getPageShellWidthClass, type PageShellWidth } from './shell-width';

interface PageShellProps {
  children: ReactNode;
  width?: PageShellWidth;
}

export function PageShell({ children, width = 'workspace' }: PageShellProps) {
  return (
    <>
      <Navbar />
      <main
        className={`app-shell app-copy flex-1 p-6 ${getPageShellWidthClass(width)} mx-auto w-full relative overflow-hidden`}
        id="main-content"
      >
        <div className="pointer-events-none absolute inset-0 app-grid-overlay" />
        {children}
      </main>
    </>
  );
}