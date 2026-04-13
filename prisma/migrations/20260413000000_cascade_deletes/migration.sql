-- Change Project.userId FK from RESTRICT to CASCADE
ALTER TABLE "Project" DROP CONSTRAINT "Project_userId_fkey";
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Change Artifact.userId FK from RESTRICT to CASCADE
ALTER TABLE "Artifact" DROP CONSTRAINT "Artifact_userId_fkey";
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Change Artifact.projectId FK from RESTRICT to CASCADE
ALTER TABLE "Artifact" DROP CONSTRAINT "Artifact_projectId_fkey";
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Change QuotaHistory.userId FK from RESTRICT to CASCADE
ALTER TABLE "QuotaHistory" DROP CONSTRAINT "QuotaHistory_userId_fkey";
ALTER TABLE "QuotaHistory" ADD CONSTRAINT "QuotaHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
