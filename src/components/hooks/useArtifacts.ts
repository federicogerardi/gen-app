import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Artifact {
  id: string;
  projectId: string;
  type: string;
  model: string;
  input: Record<string, unknown>;
  content: string;
  status: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: string;
  createdAt: string;
  completedAt: string | null;
}

async function fetchArtifact(id: string): Promise<Artifact> {
  const res = await fetch(`/api/artifacts/${id}`);
  if (!res.ok) throw new Error('Failed to fetch artifact');
  const data = await res.json();
  return data.artifact;
}

async function deleteArtifact(id: string): Promise<void> {
  const res = await fetch(`/api/artifacts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete artifact');
}

export function useArtifact(id: string) {
  return useQuery({
    queryKey: ['artifact', id],
    queryFn: () => fetchArtifact(id),
    enabled: !!id,
  });
}

export function useDeleteArtifact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteArtifact,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ['artifact', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
