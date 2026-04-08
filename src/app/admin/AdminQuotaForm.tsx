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
  const queryClient = useQueryClient();

  async function handleSave() {
    setSubmitting(true);
    setMessage(null);

    const res = await fetch(`/api/admin/users/${userId}/quota`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monthlyQuota: Number(quota),
        monthlyBudget: Number(budget),
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      setMessage('Salvato');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onSaved?.();
    } else {
      const data = await res.json();
      setMessage(data.error?.message ?? 'Errore');
    }
  }

  async function handleReset() {
    setSubmitting(true);
    setMessage(null);

    const res = await fetch(`/api/admin/users/${userId}/quota`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetUsage: true }),
    });

    setSubmitting(false);
    setMessage(res.ok ? 'Utilizzo azzerato' : 'Errore');
  }

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="space-y-1">
        <Label className="text-xs" htmlFor={`quota-${userId}`}>Quota mensile</Label>
        <Input id={`quota-${userId}`} type="number" value={quota} onChange={(e) => setQuota(e.target.value)} className="w-24 h-8 text-sm" min={1} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs" htmlFor={`budget-${userId}`}>Budget ($)</Label>
        <Input id={`budget-${userId}`} type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="w-24 h-8 text-sm" min={0} step={0.01} />
      </div>
      <Button size="sm" onClick={handleSave} disabled={submitting}>Salva</Button>
      <Button size="sm" variant="outline" onClick={handleReset} disabled={submitting}>Azzera utilizzo</Button>
      {message && <span className="text-xs text-muted-foreground" aria-live="polite">{message}</span>}
    </div>
  );
}
