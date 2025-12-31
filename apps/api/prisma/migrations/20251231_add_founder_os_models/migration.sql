-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('PLAYBOOK', 'PILOT_PACK', 'PRD', 'PITCH', 'OUTREACH_EMAIL', 'MODEL_SHEET', 'MEETING_NOTES', 'CONTRACT', 'RESEARCH_NOTE', 'DESIGN_DOC', 'TEST_PLAN', 'OTHER');

-- CreateEnum
CREATE TYPE "ArtifactStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'SENT', 'SIGNED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GateCheckType" AS ENUM ('ARTIFACT_EXISTS', 'METRIC_THRESHOLD', 'CHECKLIST_COMPLETE', 'MANUAL_APPROVAL', 'TASK_COMPLETION');

-- AlterTable (add phaseId to Task)
ALTER TABLE "Task" ADD COLUMN "phaseId" TEXT;

-- CreateTable Workspace
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "objectives" TEXT[],
    "constraints" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable Artifact
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "status" "ArtifactStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "storagePath" TEXT,
    "storageUrl" TEXT,
    "tags" TEXT[],
    "createdBy" TEXT NOT NULL,
    "source" TEXT,
    "parentId" TEXT,
    "lineage" JSONB NOT NULL DEFAULT '[]',
    "searchVector" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable Playbook
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable Phase
CREATE TABLE "Phase" (
    "id" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable Gate
CREATE TABLE "Gate" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "checkType" "GateCheckType" NOT NULL,
    "checkConfig" JSONB NOT NULL,
    "blocking" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastChecked" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gate_pkey" PRIMARY KEY ("id")
);

-- CreateTable Scoreboard
CREATE TABLE "Scoreboard" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cadence" TEXT NOT NULL DEFAULT 'weekly',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scoreboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable Metric
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "scoreboardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "target" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "dataSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable MetricSnapshot
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable WeeklyReview
CREATE TABLE "WeeklyReview" (
    "id" TEXT NOT NULL,
    "scoreboardId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "achievements" TEXT[],
    "challenges" TEXT[],
    "decisions" JSONB NOT NULL DEFAULT '[]',
    "nextExperiments" JSONB NOT NULL DEFAULT '[]',
    "failureTaxonomy" JSONB NOT NULL DEFAULT '{}',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE INDEX "Workspace_userId_idx" ON "Workspace"("userId");
CREATE INDEX "Workspace_slug_idx" ON "Workspace"("slug");
CREATE INDEX "Workspace_status_idx" ON "Workspace"("status");
CREATE INDEX "Workspace_createdAt_idx" ON "Workspace"("createdAt");

CREATE INDEX "Artifact_workspaceId_idx" ON "Artifact"("workspaceId");
CREATE INDEX "Artifact_type_idx" ON "Artifact"("type");
CREATE INDEX "Artifact_status_idx" ON "Artifact"("status");
CREATE INDEX "Artifact_createdBy_idx" ON "Artifact"("createdBy");
CREATE INDEX "Artifact_parentId_idx" ON "Artifact"("parentId");
CREATE INDEX "Artifact_contentHash_idx" ON "Artifact"("contentHash");
CREATE INDEX "Artifact_createdAt_idx" ON "Artifact"("createdAt");
CREATE INDEX "Artifact_updatedAt_idx" ON "Artifact"("updatedAt");

CREATE INDEX "Playbook_workspaceId_idx" ON "Playbook"("workspaceId");
CREATE INDEX "Playbook_isTemplate_idx" ON "Playbook"("isTemplate");
CREATE INDEX "Playbook_createdBy_idx" ON "Playbook"("createdBy");

CREATE INDEX "Phase_playbookId_idx" ON "Phase"("playbookId");
CREATE INDEX "Phase_order_idx" ON "Phase"("order");
CREATE INDEX "Phase_status_idx" ON "Phase"("status");

CREATE INDEX "Gate_phaseId_idx" ON "Gate"("phaseId");
CREATE INDEX "Gate_status_idx" ON "Gate"("status");
CREATE INDEX "Gate_checkType_idx" ON "Gate"("checkType");

CREATE INDEX "Scoreboard_workspaceId_idx" ON "Scoreboard"("workspaceId");
CREATE INDEX "Scoreboard_createdBy_idx" ON "Scoreboard"("createdBy");

CREATE INDEX "Metric_scoreboardId_idx" ON "Metric"("scoreboardId");

CREATE INDEX "MetricSnapshot_metricId_idx" ON "MetricSnapshot"("metricId");
CREATE INDEX "MetricSnapshot_timestamp_idx" ON "MetricSnapshot"("timestamp");

CREATE UNIQUE INDEX "WeeklyReview_scoreboardId_year_weekNumber_key" ON "WeeklyReview"("scoreboardId", "year", "weekNumber");
CREATE INDEX "WeeklyReview_scoreboardId_idx" ON "WeeklyReview"("scoreboardId");
CREATE INDEX "WeeklyReview_year_idx" ON "WeeklyReview"("year");
CREATE INDEX "WeeklyReview_weekNumber_idx" ON "WeeklyReview"("weekNumber");
CREATE INDEX "WeeklyReview_createdBy_idx" ON "WeeklyReview"("createdBy");

CREATE INDEX "Task_phaseId_idx" ON "Task"("phaseId");

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Artifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Phase" ADD CONSTRAINT "Phase_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Gate" ADD CONSTRAINT "Gate_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Scoreboard" ADD CONSTRAINT "Scoreboard_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Metric" ADD CONSTRAINT "Metric_scoreboardId_fkey" FOREIGN KEY ("scoreboardId") REFERENCES "Scoreboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "Metric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WeeklyReview" ADD CONSTRAINT "WeeklyReview_scoreboardId_fkey" FOREIGN KEY ("scoreboardId") REFERENCES "Scoreboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task" ADD CONSTRAINT "Task_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
