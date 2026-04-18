/**
 * Shared types for all tool workflow pages (funnel-pages, nextland, extraction, etc.)
 * Unifies FunnelStepState, NextLandStepState through generic ToolStepState<T>
 */

import type { ReactNode } from 'react';

export type ToolStepKey = string & { readonly __brand: 'ToolStepKey' };

export interface ToolStepState<TKey extends string = string> {
  key: TKey;
  title: string;
  status: 'idle' | 'running' | 'done' | 'error';
  content: string;
  artifactId: string | null;
  error: string | null;
}

export type Phase = 'idle' | 'uploading' | 'extracting' | 'review' | 'generating';
export type ToolIntent = 'new' | 'resume' | 'regenerate';
export type ToolUiState =
  | 'draft-empty'
  | 'processing-briefing'
  | 'draft-ready'
  | 'prefilled-regenerate'
  | 'paused-with-checkpoint'
  | 'resume-needs-briefing'
  | 'running'
  | 'completed';

export type ExtractionLifecycleState =
  | 'idle'
  | 'in_progress'
  | 'completed_partial'
  | 'completed_full'
  | 'failed_hard';

export interface StreamResult {
  content: string;
  artifactId: string | null;
}

export interface ResumeCandidateArtifact {
  id: string;
  type: string;
  workflowType?: string | null;
  status: string;
  content: string;
  createdAt: string;
  input?: Record<string, unknown>;
}

export interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: {
      reason?: string;
      maxCostUsd?: number;
      cumulativeCostUsd?: number;
    };
  };
}

export interface RetryMeta {
  retryable: boolean;
}

export interface FieldLabelProps {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}

export type ToneValue = 'professional' | 'casual' | 'formal' | 'technical';
export type FunnelStepKey = 'optin' | 'quiz' | 'vsl';
export type NextLandStepKey = 'landing' | 'thank_you';

export function isFunnelStepKey(key: string): key is FunnelStepKey {
  return ['optin', 'quiz', 'vsl'].includes(key);
}

export function isNextLandStepKey(key: string): key is NextLandStepKey {
  return ['landing', 'thank_you'].includes(key);
}
