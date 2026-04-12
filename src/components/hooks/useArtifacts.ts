import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Artifact {
  id: string;
  projectId: string;
  project?: { id: string; name: string };
  type: string;
  workflowType?: string | null;
  model: string;
  input: Record<string, unknown>;
  content: string;
  status: string;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
  completedAt: string | null;
}

export interface ArtifactsListResponse {
  items: Artifact[];
  total: number;
  limit: number;
  offset: number;
}

export interface ArtifactsQuery {
  projectId?: string;
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

async function fetchArtifact(id: string): Promise<Artifact> {
  const res = await fetch(`/api/artifacts/${id}`);
  if (!res.ok) throw new Error('Failed to fetch artifact');
  const data = await res.json();
  return data.artifact;
}

async function fetchArtifacts(query: ArtifactsQuery = {}): Promise<ArtifactsListResponse> {
  const searchParams = new URLSearchParams();
  if (query.projectId) searchParams.set('projectId', query.projectId);
  if (query.status) searchParams.set('status', query.status);
  if (query.type) searchParams.set('type', query.type);
  if (query.limit) searchParams.set('limit', String(query.limit));
  if (query.offset) searchParams.set('offset', String(query.offset));

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const res = await fetch(`/api/artifacts${suffix}`);
  if (!res.ok) throw new Error('Failed to fetch artifacts');
  return res.json();
}

async function deleteArtifact(id: string): Promise<void> {
  const res = await fetch(`/api/artifacts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete artifact');
}

async function updateArtifact({ id, content }: { id: string; content: string }): Promise<Artifact> {
  const res = await fetch(`/api/artifacts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to update artifact');
  const data = await res.json();
  return data.artifact;
}

export function useArtifacts(query: ArtifactsQuery = {}) {
  return useQuery({
    queryKey: ['artifacts', query],
    queryFn: () => fetchArtifacts(query),
  });
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
      queryClient.invalidateQueries({ queryKey: ['artifacts'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateArtifact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateArtifact,
    onSuccess: (artifact) => {
      queryClient.setQueryData(['artifact', artifact.id], artifact);
      queryClient.invalidateQueries({ queryKey: ['artifacts'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
