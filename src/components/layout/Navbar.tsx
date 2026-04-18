'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RuntimeStatusBadge } from './RuntimeStatusBadge';
import { NAVBAR_WIDTH_CLASS } from './shell-width';

const toolLinks = [
  { href: '/tools/funnel-pages', label: 'HotLeadFunnel' },
  { href: '/tools/nextland', label: 'NextLand' },
];

function linkClass(isActive: boolean) {
  return isActive
    ? 'text-foreground font-medium underline decoration-2 underline-offset-4'
    : 'text-muted-foreground hover:text-foreground transition-colors';
}

function isDashboardActive(pathname: string) {
  return pathname === '/dashboard';
}

function isProjectsActive(pathname: string) {
  return pathname.startsWith('/dashboard/projects');
}

function isArtifactsActive(pathname: string) {
  return pathname === '/artifacts' || pathname.startsWith('/artifacts/');
}

function isAdminActive(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

function toolsTriggerClass(pathname: string) {
  const isActive = pathname.startsWith('/tools/');
  return linkClass(isActive);
}

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="runtime-chrome-navbar sticky top-0 z-30 border-b border-black/10 bg-[#fbf8f2]/90 backdrop-blur px-4 py-3 app-copy" aria-label="Navigazione principale">
      <div className={`${NAVBAR_WIDTH_CLASS} mx-auto`}>
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="app-title text-xl font-semibold text-slate-900" aria-label="Vai alla dashboard">Gen App</Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm" role="list" aria-label="Sezioni applicazione">
            <Link
              href="/dashboard"
              className={linkClass(isDashboardActive(pathname))}
              aria-current={isDashboardActive(pathname) ? 'page' : undefined}
            >
              Dashboard
            </Link>

            <Link
              href="/dashboard/projects"
              className={linkClass(isProjectsActive(pathname))}
              aria-current={isProjectsActive(pathname) ? 'page' : undefined}
            >
              Progetti
            </Link>

            <details className="group relative">
              <summary className={`${toolsTriggerClass(pathname)} flex list-none cursor-pointer items-center gap-1 [&::-webkit-details-marker]:hidden`}>
                Tools
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-black/10 bg-white/95 p-1.5 shadow-[0_22px_48px_-34px_rgba(15,23,42,0.7)]">
                {toolLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block rounded-lg px-2 py-1.5 ${linkClass(pathname === link.href || pathname.startsWith(`${link.href}/`))}`}
                    aria-current={pathname === link.href || pathname.startsWith(`${link.href}/`) ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </details>

            <Link
              href="/artifacts"
              className={linkClass(isArtifactsActive(pathname))}
              aria-current={isArtifactsActive(pathname) ? 'page' : undefined}
            >
              Storico
            </Link>

            {session?.user?.role === 'admin' && (
              <Link
                href="/admin"
                className={linkClass(isAdminActive(pathname))}
                aria-current={isAdminActive(pathname) ? 'page' : undefined}
              >
                Admin
              </Link>
            )}
          </div>

          {/* Desktop user area */}
          <div className="hidden md:flex items-center gap-3">
            <RuntimeStatusBadge />
            <span className="text-sm text-muted-foreground max-w-[20vw] truncate" title={session?.user?.email ?? undefined}>{session?.user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              aria-label="Esci dalla sessione"
              className="border-black/15 bg-white/80"
            >
              Esci
            </Button>
          </div>

          {/* Mobile: user actions + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Chiudi menu' : 'Apri menu'}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div id="mobile-menu" className="md:hidden pt-3 pb-1 flex flex-col gap-2 text-sm border-t border-black/10 mt-3" role="list" aria-label="Sezioni applicazione">
            <Link
              href="/dashboard"
              className={`${linkClass(isDashboardActive(pathname))} py-1`}
              aria-current={isDashboardActive(pathname) ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>

            <Link
              href="/dashboard/projects"
              className={`${linkClass(isProjectsActive(pathname))} py-1`}
              aria-current={isProjectsActive(pathname) ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              Progetti
            </Link>

            <details className="group rounded border px-2 py-1">
              <summary className={`${toolsTriggerClass(pathname)} flex list-none cursor-pointer items-center justify-between py-1 [&::-webkit-details-marker]:hidden`}>
                Tools
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-1 flex flex-col gap-1 pl-2">
                {toolLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`${linkClass(pathname === link.href || pathname.startsWith(`${link.href}/`))} py-1`}
                    aria-current={pathname === link.href || pathname.startsWith(`${link.href}/`) ? 'page' : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </details>

            <Link
              href="/artifacts"
              className={`${linkClass(isArtifactsActive(pathname))} py-1`}
              aria-current={isArtifactsActive(pathname) ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              Storico
            </Link>

            {session?.user?.role === 'admin' && (
              <Link
                href="/admin"
                className={`${linkClass(isAdminActive(pathname))} py-1`}
                aria-current={isAdminActive(pathname) ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                Admin
              </Link>
            )}
            <span className="text-xs text-muted-foreground truncate pt-1 border-t mt-1">{session?.user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              aria-label="Esci dalla sessione"
              className="border-black/15 bg-white/80 mt-2"
            >
              Esci
            </Button>
            <div className="pt-2 border-t border-black/10">
              <RuntimeStatusBadge />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
