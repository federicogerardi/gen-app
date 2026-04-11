'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Role } from '@/generated/prisma';
import { X } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminQuotaForm } from './AdminQuotaForm';

type UserItem = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  monthlyQuota: number;
  monthlyUsed: number;
  monthlyBudget: number | string;
  monthlySpent: number | string;
  resetDate: string | Date;
};

type ActivityItem = {
  id: string;
  artifactType: string;
  model: string;
  status: string;
  costUSD: number | string;
  createdAt: string | Date;
  user: {
    email: string;
    name: string | null;
  };
};

type Props = {
  totalArtifacts: number;
  completedArtifacts: number;
  recentActivity: ActivityItem[];
  baselineMetrics: {
    generatedAt: string;
    completionRate: number;
    avgCompletionSeconds: number;
    p95CompletionSeconds: number;
    requestSuccessRate30d: number;
    requestErrorRate30d: number;
    requestRateLimitedRate30d: number;
    sampleSizeArtifacts: number;
    sampleSizeRequests30d: number;
  };
  totalUsers: number;
};

function getTrafficClass(ratio: number) {
  if (ratio < 0.7) return 'bg-emerald-100 text-emerald-800';
  if (ratio < 0.9) return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-800';
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'n/d';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'success') return 'default';
  if (status === 'error') return 'destructive';
  if (status === 'rate_limited') return 'outline';
  return 'secondary';
}

function getArtifactTypeLabel(type: string): string {
  if (type === 'content') return 'Content';
  if (type === 'seo') return 'SEO';
  if (type === 'code') return 'Code';
  return type;
}

export function AdminClientPage({
  totalArtifacts,
  completedArtifacts,
  recentActivity,
  baselineMetrics,
  totalUsers,
}: Props) {
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activityStatus, setActivityStatus] = useState<'all' | 'success' | 'error' | 'rate_limited'>('all');
  const [activityType, setActivityType] = useState<'all' | 'content' | 'seo' | 'code'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Fetch users when page changes
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const offset = (currentPage - 1) * pageSize;
        const response = await fetch(`/api/admin/users?limit=${pageSize}&offset=${offset}`);
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        setUsers(data.users);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError('Errore nel caricamento degli utenti');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [currentPage, pageSize]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      const haystack = `${user.name ?? ''} ${user.email}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [users, query]);

  const totalSpent = users.reduce((acc, user) => acc + Number(user.monthlySpent), 0);
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const totalPages = Math.ceil(totalUsers / pageSize);

  const filteredActivity = useMemo(() => {
    return recentActivity.filter((entry) => {
      if (activityStatus !== 'all' && entry.status !== activityStatus) return false;
      if (activityType !== 'all' && entry.artifactType !== activityType) return false;
      return true;
    });
  }, [recentActivity, activityStatus, activityType]);

  useEffect(() => {
    if (!selectedUserId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedUserId(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedUserId]);

  useEffect(() => {
    if (!selectedUserId) return;

    previousActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const drawer = drawerRef.current;
    if (drawer) {
      const firstFocusable = drawer.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      firstFocusable?.focus();
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      previousActiveElementRef.current?.focus();
    };
  }, [selectedUserId]);

  function handleDrawerKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusableElements = drawer.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusableElements.length === 0) return;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
      return;
    }

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    }
  }

  return (
    <>
      <Navbar />
      <main className="app-shell app-copy flex-1 p-6 max-w-5xl mx-auto w-full relative overflow-hidden" id="main-content">
        <div className="pointer-events-none absolute inset-0 app-grid-overlay" />
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <h1 className="app-title text-3xl font-semibold text-slate-900">Gestione utenti</h1>
          <div className="w-full sm:w-80">
            <Label htmlFor="admin-user-search" className="sr-only">Cerca utente</Label>
            <Input
              id="admin-user-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca utente per nome o email"
              className="app-control"
              aria-describedby="admin-user-search-help"
            />
            <p id="admin-user-search-help" className="sr-only">Filtra la lista utenti per nome o email.</p>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mb-8">
          <Card className="app-surface rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Utenti</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{totalUsers}</p></CardContent>
          </Card>
          <Card className="app-surface rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Artefatti</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{totalArtifacts}</p></CardContent>
          </Card>
          <Card className="app-surface rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Completati</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{completedArtifacts}</p></CardContent>
          </Card>
          <Card className="app-surface rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Spesa mensile</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">${totalSpent.toFixed(2)}</p></CardContent>
          </Card>
        </div>

        {/* Pagination info and controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="text-sm text-muted-foreground">
            Pagina {currentPage} di {totalPages} • Mostrando {users.length} di {totalUsers} utenti
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isLoading}
            >
              Precedente
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || isLoading}
            >
              Successivo
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Caricamento utenti...
              </CardContent>
            </Card>
          )}

          {error && (
            <Card>
              <CardContent className="py-8 text-center text-destructive">
                {error}
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && filteredUsers.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {query.trim() ? 'Nessun utente trovato con i filtri correnti.' : 'Nessun utente disponibile.'}
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && filteredUsers.length > 0 && (
            <>
              <p className="sr-only" aria-live="polite">{filteredUsers.length} utenti mostrati con i filtri correnti.</p>
              {filteredUsers.map((u) => {
                const quotaRatio = u.monthlyQuota > 0 ? u.monthlyUsed / u.monthlyQuota : 1;
                const budgetRatio = Number(u.monthlyBudget) > 0 ? Number(u.monthlySpent) / Number(u.monthlyBudget) : 1;

                return (
                  <Card key={u.id} className="app-surface rounded-2xl">
                    <CardHeader className="pb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{u.name ?? u.email}</CardTitle>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-muted-foreground">Quota</p>
                          <p className="font-medium">{u.monthlyUsed} / {u.monthlyQuota}</p>
                          <span className={`inline-flex mt-1 rounded-full px-2 py-0.5 text-xs ${getTrafficClass(quotaRatio)}`}>
                            {Math.round(quotaRatio * 100)}%
                          </span>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Budget</p>
                          <p className="font-medium">${Number(u.monthlySpent).toFixed(2)} / ${Number(u.monthlyBudget).toFixed(2)}</p>
                          <span className={`inline-flex mt-1 rounded-full px-2 py-0.5 text-xs ${getTrafficClass(budgetRatio)}`}>
                            {Math.round(budgetRatio * 100)}%
                          </span>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Reset</p>
                          <p className="font-medium">{new Date(u.resetDate).toLocaleDateString('it-IT')}</p>
                        </div>
                      </div>
                      <Button className="w-full sm:w-auto" size="sm" variant="outline" onClick={() => setSelectedUserId(u.id)}>
                        Gestisci quota
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>

        <section className="mt-10">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="app-title text-xl font-medium">Metriche baseline (30 giorni)</h2>
              <p className="text-sm text-muted-foreground">
                Snapshot generato il {new Date(baselineMetrics.generatedAt).toLocaleString('it-IT')}.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="app-surface rounded-2xl">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Completion rate</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatPercent(baselineMetrics.completionRate)}</p></CardContent>
            </Card>
            <Card className="app-surface rounded-2xl">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Tempo medio completamento</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatDuration(baselineMetrics.avgCompletionSeconds)}</p></CardContent>
            </Card>
            <Card className="app-surface rounded-2xl">
              <CardHeader className="pb-2"><CardTitle className="text-sm">P95 completamento</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatDuration(baselineMetrics.p95CompletionSeconds)}</p></CardContent>
            </Card>
            <Card className="app-surface rounded-2xl">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Success rate richieste</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatPercent(baselineMetrics.requestSuccessRate30d)}</p></CardContent>
            </Card>
          </div>

          <dl className="grid gap-2 md:grid-cols-2 text-sm text-muted-foreground mb-8" aria-label="Dettaglio metriche baseline">
            <div className="rounded-md border border-black/10 bg-white/75 p-3">
              <dt className="font-medium text-foreground">Error rate richieste (30g)</dt>
              <dd>{formatPercent(baselineMetrics.requestErrorRate30d)}</dd>
            </div>
            <div className="rounded-md border border-black/10 bg-white/75 p-3">
              <dt className="font-medium text-foreground">Rate-limited rate richieste (30g)</dt>
              <dd>{formatPercent(baselineMetrics.requestRateLimitedRate30d)}</dd>
            </div>
            <div className="rounded-md border border-black/10 bg-white/75 p-3">
              <dt className="font-medium text-foreground">Campione artefatti</dt>
              <dd>{baselineMetrics.sampleSizeArtifacts}</dd>
            </div>
            <div className="rounded-md border border-black/10 bg-white/75 p-3">
              <dt className="font-medium text-foreground">Campione richieste (30g)</dt>
              <dd>{baselineMetrics.sampleSizeRequests30d}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <h2 className="text-lg font-medium">Attivita recente</h2>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="activity-status-filter" className="text-xs">Stato</Label>
                <Select value={activityStatus} onValueChange={(value) => setActivityStatus(value as typeof activityStatus)}>
                  <SelectTrigger id="activity-status-filter" className="app-control w-full sm:w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="rate_limited">Rate limited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="activity-type-filter" className="text-xs">Tipo</Label>
                <Select value={activityType} onValueChange={(value) => setActivityType(value as typeof activityType)}>
                  <SelectTrigger id="activity-type-filter" className="app-control w-full sm:w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="seo">SEO</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Card className="app-surface rounded-2xl">
            <CardContent className="pt-4 space-y-3" aria-live="polite">
              <p className="sr-only">{filteredActivity.length} eventi recenti mostrati con i filtri correnti.</p>
              {filteredActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun evento disponibile.</p>
              ) : filteredActivity.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-start justify-between gap-3 border-l-2 border-border pl-3 pb-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{entry.user.name ?? entry.user.email}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{getArtifactTypeLabel(entry.artifactType)}</Badge>
                      <Badge variant="outline" className="text-[10px]">{entry.model}</Badge>
                      <Badge variant={getStatusBadgeVariant(entry.status)} className="text-[10px]">{entry.status}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${Number(entry.costUSD).toFixed(4)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString('it-IT')}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>

      {selectedUser && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Chiudi pannello"
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelectedUserId(null)}
            type="button"
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            aria-describedby="drawer-description"
            className="absolute right-0 top-0 h-full w-full max-w-md bg-[#f8f5ee] border-l border-black/10 shadow-xl p-6 overflow-y-auto app-copy"
            onKeyDown={handleDrawerKeyDown}
          >
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <h3 id="drawer-title" className="app-title text-lg font-semibold">Modifica quota e budget</h3>
                <p id="drawer-description" className="text-sm text-muted-foreground">{selectedUser.name ?? selectedUser.email}</p>
              </div>
              <Button size="icon-sm" variant="ghost" onClick={() => setSelectedUserId(null)} aria-label="Chiudi">
                <X />
              </Button>
            </div>

            <AdminQuotaForm
              userId={selectedUser.id}
              currentQuota={selectedUser.monthlyQuota}
              currentBudget={Number(selectedUser.monthlyBudget)}
            />

            <div className="mt-6 rounded-md border border-black/10 bg-white/75 p-3 text-sm">
              <p className="text-xs text-muted-foreground">Stato attuale</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Utilizzo quota</p>
                  <p className="font-medium">{selectedUser.monthlyUsed} / {selectedUser.monthlyQuota}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Spesa budget</p>
                  <p className="font-medium">${Number(selectedUser.monthlySpent).toFixed(2)} / ${Number(selectedUser.monthlyBudget).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
