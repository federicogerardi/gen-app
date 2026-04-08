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
    ? 'text-foreground font-medium'
    : 'text-muted-foreground hover:text-foreground transition-colors';
}

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background/95 backdrop-blur px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-lg">Gen App</Link>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(pathname, link.href)}>{link.label}</Link>
            ))}
            {session?.user?.role === 'admin' && (
              <Link href="/admin" className={linkClass(pathname, '/admin')}>Admin</Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {session?.user?.role === 'admin' && <Badge variant="secondary">Admin</Badge>}
          <span className="text-sm text-muted-foreground hidden sm:inline">{session?.user?.email}</span>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            Esci
          </Button>
        </div>
      </div>
    </nav>
  );
}
