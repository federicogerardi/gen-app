/**
 * Shared serialization helpers for artifact API responses.
 * Centralizes the cost-stripping policy so all artifact endpoints
 * apply it consistently without copy-pasting the same function.
 */

/**
 * Remove the `costUSD` field from an artifact before sending it to the client.
 * Cost information is admin-only and must not be exposed in user-facing endpoints.
 */
export function stripArtifactCost<T>(artifact: T): Omit<T, 'costUSD'> {
  const { costUSD, ...sanitizedArtifact } = artifact as T & { costUSD?: unknown };
  void costUSD;
  return sanitizedArtifact as Omit<T, 'costUSD'>;
}
