import type {
  ToolStepState,
  ToolIntent,
  ToolUiState,
  Phase,
  StreamResult,
  ResumeCandidateArtifact,
  RetryMeta,
  ExtractionLifecycleState,
  ApiErrorPayload,
  FunnelStepKey,
} from '@/tools/shared';

export type {
  ToolIntent,
  ToolUiState,
  Phase,
  StreamResult,
  ResumeCandidateArtifact,
  RetryMeta,
  ExtractionLifecycleState,
  ApiErrorPayload,
  FunnelStepKey,
};

export type FunnelStepState = ToolStepState<FunnelStepKey>;

export type FunnelIntent = ToolIntent;
export type FunnelUiState = ToolUiState;
