'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ArtifactEditorProps {
  artifactId: string;
  initialContent: string;
}

export function ArtifactEditor({ artifactId, initialContent }: ArtifactEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const response = await fetch(`/api/artifacts/${artifactId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setMessage(data?.error?.message ?? 'Errore durante il salvataggio');
      return;
    }

    setMessage('Salvato');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Textarea value={content} onChange={(event) => setContent(event.target.value)} rows={16} className="font-mono text-sm" />
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || !content.trim()}>
          {saving ? 'Salvataggio…' : 'Salva modifiche'}
        </Button>
        {message && <span className="text-sm text-muted-foreground">{message}</span>}
      </div>
    </div>
  );
}