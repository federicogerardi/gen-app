'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { RuntimeInfo } from '@/lib/runtime-info';

const RuntimeInfoContext = createContext<RuntimeInfo | null>(null);

export function RuntimeInfoProvider({ value, children }: { value: RuntimeInfo; children: ReactNode }) {
  return <RuntimeInfoContext.Provider value={value}>{children}</RuntimeInfoContext.Provider>;
}

export function useRuntimeInfo(): RuntimeInfo {
  const context = useContext(RuntimeInfoContext);
  if (!context) {
    throw new Error('useRuntimeInfo must be used within RuntimeInfoProvider.');
  }
  return context;
}