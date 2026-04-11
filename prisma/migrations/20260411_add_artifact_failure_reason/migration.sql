-- AddColumn failureReason to Artifact (S1-06: disconnect cleanup)
ALTER TABLE "Artifact" ADD COLUMN "failureReason" TEXT;
