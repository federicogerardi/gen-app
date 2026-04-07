import { useQuery } from '@tanstack/react-query';

export interface QuotaInfo {
  monthlyQuota: number;
  monthlyUsed: number;
  monthlyBudget: string;
  monthlySpent: string;
  resetDate: string;
}

async function fetchQuota(): Promise<QuotaInfo> {
  const res = await fetch('/api/users/quota');
  if (!res.ok) throw new Error('Failed to fetch quota');
  const data = await res.json();
  return data.quota;
}

export function useQuota() {
  return useQuery({
    queryKey: ['quota'],
    queryFn: fetchQuota,
    staleTime: 60_000,
  });
}
