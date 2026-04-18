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
  NextLandStepKey,
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
  NextLandStepKey,
};

export type NextLandStepState = ToolStepState<NextLandStepKey>;

export type NextLandIntent = ToolIntent;
export type NextLandUiState = ToolUiState;