'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
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

  return (
    <nav className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur px-4 py-3" aria-label="Navigazione principale">
      <div className="max-w-6xl mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <Link href="/dashboard" className="font-semibold text-lg" aria-label="Vai alla dashboard">Gen App</Link>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm" role="list" aria-label="Sezioni applicazione">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={linkClass(pathname, link.href)}
                aria-current={pathname === link.href || pathname.startsWith(`${link.href}/`) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
            {session?.user?.role === 'admin' && (
              <Link
                href="/admin"
                className={linkClass(pathname, '/admin')}
                aria-current={pathname === '/admin' || pathname.startsWith('/admin/') ? 'page' : undefined}
              >
                Admin
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 justify-between sm:justify-end">
          {session?.user?.role === 'admin' && <Badge variant="secondary">Admin</Badge>}
          <span className="text-sm text-muted-foreground max-w-[40vw] truncate hidden sm:inline" title={session?.user?.email ?? undefined}>{session?.user?.email}</span>
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
      </div>
    </nav>
  );
}
