-- Add indexes on Artifact.type and Artifact.status for query performance.
-- These columns are used for filtering in GET /artifacts and internal cron queries.
CREATE INDEX "Artifact_type_idx" ON "Artifact"("type");
CREATE INDEX "Artifact_status_idx" ON "Artifact"("status");
