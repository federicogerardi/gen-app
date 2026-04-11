'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || undefined }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message ?? 'Errore nella creazione');
      setSubmitting(false);
      return;
    }

    const data = await res.json();
    router.push(`/dashboard/projects/${data.project.id}`);
  }

  return (
    <>
      <Navbar />
      <main className="app-shell app-copy flex-1 p-6 max-w-lg mx-auto w-full relative overflow-hidden" id="main-content">
        <div className="pointer-events-none absolute inset-0 app-grid-overlay" />
        <Card className="app-surface rounded-3xl app-rise">
          <CardHeader><CardTitle className="app-title text-2xl">Nuovo progetto</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input className="app-control" id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Descrizione (opzionale)</Label>
                <Textarea className="app-control" id="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Creazione…' : 'Crea progetto'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
