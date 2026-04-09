'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const primaryLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tools/meta-ads', label: 'Meta Ads' },
  { href: '/tools/funnel-pages', label: 'Funnel Pages' },
  { href: '/artifacts', label: 'Artefatti' },
];

function linkClass(pathname: string, href: string) {
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  return isActive
    ? 'text-foreground font-medium underline decoration-2 underline-offset-4'
    : 'text-muted-foreground hover:text-foreground transition-colors';
}

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const allLinks = [
    ...primaryLinks,
    ...(session?.user?.role === 'admin' ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <nav className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur px-4 py-3" aria-label="Navigazione principale">
      <div className="max-w-6xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold text-lg" aria-label="Vai alla dashboard">Gen App</Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm" role="list" aria-label="Sezioni applicazione">
            {allLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={linkClass(pathname, link.href)}
                aria-current={pathname === link.href || pathname.startsWith(`${link.href}/`) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop user area */}
          <div className="hidden md:flex items-center gap-3">
            {session?.user?.role === 'admin' && <Badge variant="secondary">Admin</Badge>}
            <span className="text-sm text-muted-foreground max-w-[20vw] truncate" title={session?.user?.email ?? undefined}>{session?.user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              aria-label="Esci dalla sessione"
            >
              Esci
            </Button>
          </div>

          {/* Mobile: user actions + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {session?.user?.role === 'admin' && <Badge variant="secondary">Admin</Badge>}
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              aria-label="Esci dalla sessione"
            >
              Esci
            </Button>
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
          <div id="mobile-menu" className="md:hidden pt-3 pb-1 flex flex-col gap-2 text-sm border-t mt-3" role="list" aria-label="Sezioni applicazione">
            {allLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${linkClass(pathname, link.href)} py-1`}
                aria-current={pathname === link.href || pathname.startsWith(`${link.href}/`) ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <span className="text-xs text-muted-foreground truncate pt-1 border-t mt-1">{session?.user?.email}</span>
          </div>
        )}
      </div>
    </nav>
  );
}
