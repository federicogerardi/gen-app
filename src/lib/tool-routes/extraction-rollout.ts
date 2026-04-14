import { createHash } from 'node:crypto';

type RolloutReason = 'enabled' | 'flag_disabled' | 'rollback_active' | 'outside_rollout';

export type ExtractionRolloutDecision = {
  enabled: boolean;
  rollbackActive: boolean;
  rolloutPercentage: number;
  phase: 'off' | 'canary_10' | 'canary_30' | 'full_100';
  cohort: number;
  allowed: boolean;
  reason: RolloutReason;
};

function parseBooleanFlag(rawValue: string | undefined, fallback: boolean): boolean {
  if (!rawValue) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseRolloutPercentage(rawValue: string | undefined): number {
  if (!rawValue) {
    return 100;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed)) {
    return 100;
  }

  if (parsed < 0) {
    return 0;
  }

  if (parsed > 100) {
    return 100;
  }

  return parsed;
}

function getRolloutPhase(rolloutPercentage: number): ExtractionRolloutDecision['phase'] {
  if (rolloutPercentage <= 0) {
    return 'off';
  }

  if (rolloutPercentage <= 10) {
    return 'canary_10';
  }

  if (rolloutPercentage <= 30) {
    return 'canary_30';
  }

  return 'full_100';
}

export function getExtractionRolloutCohort(userId: string, projectId: string): number {
  const digest = createHash('sha256').update(`${userId}:${projectId}`).digest();
  return digest.readUInt32BE(0) % 100;
}

export function resolveExtractionRolloutDecision(input: {
  userId: string;
  projectId: string;
  env?: NodeJS.ProcessEnv;
}): ExtractionRolloutDecision {
  const env = input.env ?? process.env;
  const enabled = parseBooleanFlag(env.EXTRACTION_ARTIFACT_FIRST_ENABLED, true);
  const rollbackActive = parseBooleanFlag(env.EXTRACTION_ARTIFACT_FIRST_ROLLBACK_ACTIVE, false);
  const rolloutPercentage = parseRolloutPercentage(env.EXTRACTION_ARTIFACT_FIRST_ROLLOUT_PERCENT);
  const cohort = getExtractionRolloutCohort(input.userId, input.projectId);
  const phase = getRolloutPhase(rolloutPercentage);

  if (!enabled) {
    return {
      enabled,
      rollbackActive,
      rolloutPercentage,
      phase,
      cohort,
      allowed: false,
      reason: 'flag_disabled',
    };
  }

  if (rollbackActive) {
    return {
      enabled,
      rollbackActive,
      rolloutPercentage,
      phase,
      cohort,
      allowed: false,
      reason: 'rollback_active',
    };
  }

  if (cohort >= rolloutPercentage) {
    return {
      enabled,
      rollbackActive,
      rolloutPercentage,
      phase,
      cohort,
      allowed: false,
      reason: 'outside_rollout',
    };
  }

  return {
    enabled,
    rollbackActive,
    rolloutPercentage,
    phase,
    cohort,
    allowed: true,
    reason: 'enabled',
  };
}