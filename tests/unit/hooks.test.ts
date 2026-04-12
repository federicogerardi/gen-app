import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useQuota } from '@/components/hooks/useQuota';
import { useArtifacts } from '@/components/hooks/useArtifacts';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return Wrapper;
}

const mockFetch = (data: unknown, ok = true, status = 200) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
  } as unknown as Response);
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useQuota', () => {
  it('fetches and returns quota data', async () => {
    const quotaData = {
      monthlyQuota: 100,
      monthlyUsed: 20,
      resetDate: '2026-05-01',
    };
    mockFetch({ quota: quotaData });

    const { result } = renderHook(() => useQuota(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(quotaData);
    expect(global.fetch).toHaveBeenCalledWith('/api/users/quota');
  });

  it('returns error when fetch fails', async () => {
    mockFetch({}, false, 500);

    const { result } = renderHook(() => useQuota(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});

describe('useArtifacts', () => {
  it('fetches artifact list with no filters', async () => {
    const response = { items: [], total: 0, limit: 20, offset: 0 };
    mockFetch(response);

    const { result } = renderHook(() => useArtifacts(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.total).toBe(0);
    expect(global.fetch).toHaveBeenCalledWith('/api/artifacts');
  });

  it('includes query params when filters are provided', async () => {
    const response = { items: [], total: 0, limit: 10, offset: 0 };
    mockFetch(response);

    const { result } = renderHook(
      () => useArtifacts({ projectId: 'proj_1', type: 'content', limit: 10 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const fetchedUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchedUrl).toContain('projectId=proj_1');
    expect(fetchedUrl).toContain('type=content');
    expect(fetchedUrl).toContain('limit=10');
  });

  it('returns error when fetch fails', async () => {
    mockFetch({}, false, 500);

    const { result } = renderHook(() => useArtifacts(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
