'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b bg-background px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-semibold text-lg">Gen App</Link>
        <div className="flex gap-4 text-sm">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
          <Link href="/artifacts" className="text-muted-foreground hover:text-foreground transition-colors">Artefatti</Link>
          {session?.user?.role === 'admin' && (
            <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">Admin</Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {session?.user?.role === 'admin' && <Badge variant="secondary">Admin</Badge>}
        <span className="text-sm text-muted-foreground">{session?.user?.email}</span>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          Esci
        </Button>
      </div>
    </nav>
  );
}
