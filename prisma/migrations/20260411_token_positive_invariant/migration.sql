-- AddCheckConstraint: token positive invariant on completed artifacts
-- Enforces that inputTokens and outputTokens are > 0 when status = 'completed'.
-- The application-level guard in src/lib/llm/streaming.ts is the primary enforcement;
-- this constraint is the secondary DB-level safety net.
ALTER TABLE "Artifact"
  ADD CONSTRAINT "artifact_completed_tokens_positive_check"
  CHECK (
    "status" <> 'completed'
    OR ("inputTokens" > 0 AND "outputTokens" > 0 AND "costUSD" > 0)
  );
