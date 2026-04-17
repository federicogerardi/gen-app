/**
 * Tool workflow to artifact type mapping.
 * Normalizes tool identifiers to canonical artifact types for guard and audit purposes.
 */

import { type ArtifactType, type ToolWorkflow, isArtifactType } from '@/lib/types/artifact';

/**
 * Map tool workflow identifiers to artifact types for quota history and audit classification.
 * This ensures consistent artifactType regardless of how the tool is invoked.
 */
export const TOOL_TO_ARTIFACT_TYPE: Record<ToolWorkflow, ArtifactType> = {
  meta_ads: 'content',
  funnel_pages: 'content',
  nextland: 'content',
  extraction: 'extraction',
};

/**
 * Resolve the artifact type for a given tool workflow.
 * Ensures all tool routes use consistent artifact typing in quota history.
 *
 * @param toolWorkflow - the tool identifier (e.g. 'meta_ads', 'extraction')
 * @returns the corresponding artifact type (e.g. 'content', 'extraction')
 * @throws if toolWorkflow is not a recognized tool
 */
export function getArtifactTypeForTool(toolWorkflow: string): ArtifactType {
  const mapped = TOOL_TO_ARTIFACT_TYPE[toolWorkflow as ToolWorkflow];
  if (!mapped) {
    throw new Error(`Unknown tool workflow: ${toolWorkflow}`);
  }
  return mapped;
}

/**
 * Resolve artifact type from either a direct type or a tool workflow identifier.
 * Prefers direct artifact type if provided.
 *
 * @param typeOrTool - either an artifact type or tool workflow identifier
 * @returns the artifact type
 */
export function normalizeArtifactType(typeOrTool: string): ArtifactType {
  if (isArtifactType(typeOrTool)) {
    return typeOrTool as ArtifactType;
  }
  return getArtifactTypeForTool(typeOrTool);
}
