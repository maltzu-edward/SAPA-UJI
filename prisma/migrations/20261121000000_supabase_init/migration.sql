-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('SUPER_ADMIN', 'INSTITUTION_ADMIN', 'RESEARCHER', 'CLINICAL_REVIEWER', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED_FOR_REVIEW', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'id',
    "accessibilityPreferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "institutionType" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "contactEmail" TEXT,
    "logoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionMembership" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "membershipStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstitutionMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "RoleName" NOT NULL,
    "institutionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "institutionId" UUID NOT NULL,
    "invitedById" UUID NOT NULL,
    "assignedRole" "RoleName" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchProject" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "publicDescription" TEXT NOT NULL,
    "scientificTitle" TEXT,
    "researchType" TEXT NOT NULL,
    "researchPhase" TEXT,
    "researchPurpose" TEXT NOT NULL,
    "researchStatus" TEXT NOT NULL,
    "interventionDescription" TEXT NOT NULL,
    "controlDescription" TEXT,
    "durationDescription" TEXT NOT NULL,
    "potentialBenefits" TEXT NOT NULL,
    "potentialRisks" TEXT NOT NULL,
    "participantRights" TEXT NOT NULL,
    "sourceName" TEXT,
    "sourceVersion" TEXT,
    "sourceReference" TEXT,
    "inclusionInformation" TEXT,
    "exclusionInformation" TEXT,
    "contactInformation" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'id',
    "visibility" "ProjectVisibility" NOT NULL DEFAULT 'PRIVATE',
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchSourceDocument" (
    "id" UUID NOT NULL,
    "researchProjectId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "documentVersion" TEXT NOT NULL,
    "sourceDescription" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchSourceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchStage" (
    "id" UUID NOT NULL,
    "researchProjectId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "stageOrder" INTEGER NOT NULL,
    "estimatedDuration" TEXT,
    "whatHappens" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "possibleExperiences" TEXT NOT NULL,
    "participantRights" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationalModule" (
    "id" UUID NOT NULL,
    "researchProjectId" UUID,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceReference" TEXT,
    "contentType" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "estimatedReadingTime" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationalModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlossaryTerm" (
    "id" UUID NOT NULL,
    "term" TEXT NOT NULL,
    "simpleDefinition" TEXT NOT NULL,
    "detailedDefinition" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sourceReference" TEXT,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "GlossaryTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationalModuleGlossary" (
    "id" UUID NOT NULL,
    "educationalModuleId" UUID NOT NULL,
    "glossaryTermId" UUID NOT NULL,

    CONSTRAINT "EducationalModuleGlossary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentReview" (
    "id" UUID NOT NULL,
    "educationalModuleId" UUID,
    "researchProjectId" UUID,
    "assessmentId" UUID,
    "reviewerId" UUID NOT NULL,
    "reviewType" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL,
    "reviewerNotes" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVersion" (
    "id" UUID NOT NULL,
    "educationalModuleId" UUID,
    "researchProjectId" UUID,
    "assessmentId" UUID,
    "versionNumber" INTEGER NOT NULL,
    "contentSnapshot" JSONB NOT NULL,
    "changeDescription" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" UUID NOT NULL,
    "researchProjectId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assessmentType" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "AssessmentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "scenarioText" TEXT,
    "explanation" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "orderIndex" INTEGER NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "optionText" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "feedback" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachBackRubric" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "rubricTitle" TEXT NOT NULL,
    "rubricDescription" TEXT NOT NULL,
    "evaluationCriteria" JSONB NOT NULL,
    "reviewerGuidance" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeachBackRubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAttempt" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalScore" DOUBLE PRECISION,
    "maximumScore" DOUBLE PRECISION,
    "percentageScore" DOUBLE PRECISION,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResponse" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "selectedOptionId" UUID,
    "textResponse" TEXT,
    "awardedPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maximumPoints" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "reviewedById" UUID,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentTopicResult" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "percentageScore" DOUBLE PRECISION NOT NULL,
    "comprehensionStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentTopicResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningProgress" (
    "id" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "educationalModuleId" UUID NOT NULL,
    "progressPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationalFeedback" (
    "id" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "assessmentAttemptId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "feedbackText" TEXT NOT NULL,
    "recommendedModuleId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducationalFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantQuestion" (
    "id" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "researchProjectId" UUID NOT NULL,
    "questionText" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "researchProjectId" UUID,
    "date" DATE NOT NULL,
    "totalAttempts" INTEGER NOT NULL,
    "averageScore" DOUBLE PRECISION,
    "completionRate" DOUBLE PRECISION,
    "topicMetrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "institutionId" UUID,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_slug_key" ON "Institution"("slug");

-- CreateIndex
CREATE INDEX "Institution_status_idx" ON "Institution"("status");

-- CreateIndex
CREATE INDEX "InstitutionMembership_institutionId_idx" ON "InstitutionMembership"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionMembership_userId_institutionId_key" ON "InstitutionMembership"("userId", "institutionId");

-- CreateIndex
CREATE INDEX "UserRole_institutionId_role_idx" ON "UserRole"("institutionId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_institutionId_key" ON "UserRole"("userId", "role", "institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_institutionId_email_idx" ON "Invitation"("institutionId", "email");

-- CreateIndex
CREATE INDEX "ResearchProject_institutionId_reviewStatus_idx" ON "ResearchProject"("institutionId", "reviewStatus");

-- CreateIndex
CREATE INDEX "ResearchProject_visibility_reviewStatus_idx" ON "ResearchProject"("visibility", "reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchProject_institutionId_slug_key" ON "ResearchProject"("institutionId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchSourceDocument_storageKey_key" ON "ResearchSourceDocument"("storageKey");

-- CreateIndex
CREATE INDEX "ResearchSourceDocument_researchProjectId_idx" ON "ResearchSourceDocument"("researchProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchStage_researchProjectId_stageOrder_key" ON "ResearchStage"("researchProjectId", "stageOrder");

-- CreateIndex
CREATE INDEX "EducationalModule_researchProjectId_status_idx" ON "EducationalModule"("researchProjectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GlossaryTerm_term_language_key" ON "GlossaryTerm"("term", "language");

-- CreateIndex
CREATE UNIQUE INDEX "EducationalModuleGlossary_educationalModuleId_glossaryTermI_key" ON "EducationalModuleGlossary"("educationalModuleId", "glossaryTermId");

-- CreateIndex
CREATE INDEX "ContentReview_reviewerId_status_idx" ON "ContentReview"("reviewerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVersion_researchProjectId_versionNumber_key" ON "ContentVersion"("researchProjectId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVersion_educationalModuleId_versionNumber_key" ON "ContentVersion"("educationalModuleId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVersion_assessmentId_versionNumber_key" ON "ContentVersion"("assessmentId", "versionNumber");

-- CreateIndex
CREATE INDEX "Assessment_researchProjectId_status_idx" ON "Assessment"("researchProjectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentCategory_slug_key" ON "AssessmentCategory"("slug");

-- CreateIndex
CREATE INDEX "Question_assessmentId_status_idx" ON "Question"("assessmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Question_assessmentId_orderIndex_key" ON "Question"("assessmentId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionOption_questionId_orderIndex_key" ON "QuestionOption"("questionId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "TeachBackRubric_questionId_key" ON "TeachBackRubric"("questionId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_participantId_createdAt_idx" ON "AssessmentAttempt"("participantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAttempt_assessmentId_participantId_attemptNumber_key" ON "AssessmentAttempt"("assessmentId", "participantId", "attemptNumber");

-- CreateIndex
CREATE INDEX "AssessmentResponse_attemptId_idx" ON "AssessmentResponse"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResponse_attemptId_questionId_key" ON "AssessmentResponse"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentTopicResult_attemptId_categoryId_key" ON "AssessmentTopicResult"("attemptId", "categoryId");

-- CreateIndex
CREATE INDEX "LearningProgress_participantId_idx" ON "LearningProgress"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningProgress_participantId_educationalModuleId_key" ON "LearningProgress"("participantId", "educationalModuleId");

-- CreateIndex
CREATE INDEX "EducationalFeedback_participantId_createdAt_idx" ON "EducationalFeedback"("participantId", "createdAt");

-- CreateIndex
CREATE INDEX "ParticipantQuestion_participantId_researchProjectId_idx" ON "ParticipantQuestion"("participantId", "researchProjectId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_institutionId_date_idx" ON "AnalyticsSnapshot"("institutionId", "date");

-- CreateIndex
CREATE INDEX "AuditLog_institutionId_createdAt_idx" ON "AuditLog"("institutionId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "InstitutionMembership" ADD CONSTRAINT "InstitutionMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionMembership" ADD CONSTRAINT "InstitutionMembership_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchProject" ADD CONSTRAINT "ResearchProject_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchProject" ADD CONSTRAINT "ResearchProject_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchSourceDocument" ADD CONSTRAINT "ResearchSourceDocument_researchProjectId_fkey" FOREIGN KEY ("researchProjectId") REFERENCES "ResearchProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchSourceDocument" ADD CONSTRAINT "ResearchSourceDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchStage" ADD CONSTRAINT "ResearchStage_researchProjectId_fkey" FOREIGN KEY ("researchProjectId") REFERENCES "ResearchProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationalModule" ADD CONSTRAINT "EducationalModule_researchProjectId_fkey" FOREIGN KEY ("researchProjectId") REFERENCES "ResearchProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationalModule" ADD CONSTRAINT "EducationalModule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationalModuleGlossary" ADD CONSTRAINT "EducationalModuleGlossary_educationalModuleId_fkey" FOREIGN KEY ("educationalModuleId") REFERENCES "EducationalModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationalModuleGlossary" ADD CONSTRAINT "EducationalModuleGlossary_glossaryTermId_fkey" FOREIGN KEY ("glossaryTermId") REFERENCES "GlossaryTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReview" ADD CONSTRAINT "ContentReview_educationalModuleId_fkey" FOREIGN KEY ("educationalModuleId") REFERENCES "EducationalModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReview" ADD CONSTRAINT "ContentReview_researchProjectId_fkey" FOREIGN KEY ("researchProjectId") REFERENCES "ResearchProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReview" ADD CONSTRAINT "ContentReview_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReview" ADD CONSTRAINT "ContentReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_educationalModuleId_fkey" FOREIGN KEY ("educationalModuleId") REFERENCES "EducationalModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_researchProjectId_fkey" FOREIGN KEY ("researchProjectId") REFERENCES "ResearchProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_researchProjectId_fkey" FOREIGN KEY ("researchProjectId") REFERENCES "ResearchProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssessmentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachBackRubric" ADD CONSTRAINT "TeachBackRubric_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "QuestionOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentTopicResult" ADD CONSTRAINT "AssessmentTopicResult_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentTopicResult" ADD CONSTRAINT "AssessmentTopicResult_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssessmentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningProgress" ADD CONSTRAINT "LearningProgress_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningProgress" ADD CONSTRAINT "LearningProgress_educationalModuleId_fkey" FOREIGN KEY ("educationalModuleId") REFERENCES "EducationalModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationalFeedback" ADD CONSTRAINT "EducationalFeedback_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationalFeedback" ADD CONSTRAINT "EducationalFeedback_assessmentAttemptId_fkey" FOREIGN KEY ("assessmentAttemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationalFeedback" ADD CONSTRAINT "EducationalFeedback_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssessmentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationalFeedback" ADD CONSTRAINT "EducationalFeedback_recommendedModuleId_fkey" FOREIGN KEY ("recommendedModuleId") REFERENCES "EducationalModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantQuestion" ADD CONSTRAINT "ParticipantQuestion_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantQuestion" ADD CONSTRAINT "ParticipantQuestion_researchProjectId_fkey" FOREIGN KEY ("researchProjectId") REFERENCES "ResearchProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_researchProjectId_fkey" FOREIGN KEY ("researchProjectId") REFERENCES "ResearchProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

