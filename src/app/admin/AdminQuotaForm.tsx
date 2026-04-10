'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  userId: string;
  currentQuota: number;
  currentBudget: number;
  onSaved?: () => void;
}

export function AdminQuotaForm({ userId, currentQuota, currentBudget, onSaved }: Props) {
  const [quota, setQuota] = useState(String(currentQuota));
  const [budget, setBudget] = useState(String(currentBudget));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const parsedQuota = Number(quota);
  const parsedBudget = Number(budget);
  const isQuotaInvalid = !Number.isFinite(parsedQuota) || parsedQuota < 1;
  const isBudgetInvalid = !Number.isFinite(parsedBudget) || parsedBudget < 0;
  const hasChanges = parsedQuota !== currentQuota || parsedBudget !== currentBudget;
  const disableSave = submitting || isQuotaInvalid || isBudgetInvalid || !hasChanges;

  async function handleSave() {
    if (isQuotaInvalid) {
      setError('La quota deve essere un numero maggiore o uguale a 1.');
      return;
    }

    if (isBudgetInvalid) {
      setError('Il budget deve essere un numero maggiore o uguale a 0.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    const res = await fetch(`/api/admin/users/${userId}/quota`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monthlyQuota: parsedQuota,
        monthlyBudget: parsedBudget,
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      setMessage('Quota e budget aggiornati con successo.');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onSaved?.();
    } else {
      const data = await res.json();
      setError(data.error?.message ?? 'Errore durante il salvataggio');
    }
  }

  async function handleReset() {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    const res = await fetch(`/api/admin/users/${userId}/quota`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetUsage: true }),
    });

    setSubmitting(false);
    if (res.ok) {
      setMessage('Utilizzo mensile azzerato.');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } else {
      setError('Errore durante l\'azzeramento utilizzo.');
    }
  }

  return (
    <div className="space-y-3" aria-live="polite">
      <div className="flex items-end gap-3 flex-wrap">
      <div className="space-y-1">
        <Label className="text-xs" htmlFor={`quota-${userId}`}>Quota mensile</Label>
        <Input
          id={`quota-${userId}`}
          type="number"
          value={quota}
          onChange={(e) => setQuota(e.target.value)}
          className="app-control w-28 h-8 text-sm"
          min={1}
          aria-invalid={isQuotaInvalid}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs" htmlFor={`budget-${userId}`}>Budget ($)</Label>
        <Input
          id={`budget-${userId}`}
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="app-control w-28 h-8 text-sm"
          min={0}
          step={0.01}
          aria-invalid={isBudgetInvalid}
        />
      </div>
      <Button size="sm" onClick={handleSave} disabled={disableSave}>Salva</Button>
      <Button size="sm" variant="outline" onClick={handleReset} disabled={submitting}>Azzera utilizzo</Button>
      </div>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
      {message && <p className="text-xs text-emerald-700">{message}</p>}
    </div>
  );
}
