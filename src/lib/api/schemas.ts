import { z } from "zod";

const text = (max = 5_000) => z.string().trim().min(1).max(max);

export const projectCreateSchema = z.object({
  institutionId: z.string().uuid(),
  title: text(200),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  publicDescription: text(4_000),
  scientificTitle: z.string().trim().max(300).nullable().optional(),
  researchType: text(100),
  researchPhase: z.string().trim().max(100).nullable().optional(),
  researchPurpose: text(),
  researchStatus: text(100),
  interventionDescription: text(),
  controlDescription: z.string().trim().max(5_000).nullable().optional(),
  durationDescription: text(1_000),
  potentialBenefits: text(),
  potentialRisks: text(),
  participantRights: text(),
  sourceName: z.string().trim().max(300).nullable().optional(),
  sourceVersion: z.string().trim().max(100).nullable().optional(),
  sourceReference: z.string().trim().max(2_000).nullable().optional(),
  inclusionInformation: z.string().trim().max(5_000).nullable().optional(),
  exclusionInformation: z.string().trim().max(5_000).nullable().optional(),
  contactInformation: text(1_000),
  language: z.enum(["id", "en"]).default("id"),
});

export const projectPatchSchema = projectCreateSchema.omit({ institutionId: true }).partial();

export const moduleCreateSchema = z.object({
  researchProjectId: z.string().uuid(),
  title: text(200),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: text(1_000),
  content: text(20_000),
  sourceReference: text(2_000),
  contentType: z.enum(["PLAIN_LANGUAGE_ARTICLE", "GLOSSARY", "AUDIO_SCRIPT", "INFOGRAPHIC_TEXT"]).default("PLAIN_LANGUAGE_ARTICLE"),
  language: z.enum(["id", "en"]).default("id"),
  estimatedReadingTime: z.number().int().min(1).max(60).default(3),
  orderIndex: z.number().int().min(0).max(10_000).default(0),
});

export const modulePatchSchema = moduleCreateSchema.omit({ researchProjectId: true }).partial();

export const assessmentCreateSchema = z.object({
  researchProjectId: z.string().uuid(),
  title: text(200),
  description: text(2_000),
  assessmentType: z.enum(["COMPREHENSION", "PRE_TEST", "POST_TEST"]).default("COMPREHENSION"),
});

export const assessmentPatchSchema = assessmentCreateSchema.omit({ researchProjectId: true }).partial();

export const questionCreateSchema = z.object({
  categorySlug: z.string().trim().min(2).max(100),
  questionText: text(2_000),
  questionType: z.enum(["MULTIPLE_CHOICE", "SCENARIO", "TEACH_BACK"]),
  scenarioText: z.string().trim().max(2_000).optional(),
  explanation: text(2_000),
  difficulty: z.enum(["FOUNDATION", "INTERMEDIATE", "ADVANCED"]).default("FOUNDATION"),
  points: z.number().int().min(1).max(10).default(1),
  options: z.array(z.object({ optionText: text(1_000), isCorrect: z.boolean(), feedback: text(2_000) })).max(8).default([]),
  rubric: z.object({
    rubricTitle: text(200),
    rubricDescription: text(2_000),
    evaluationCriteria: z.array(z.unknown()).min(1).max(20),
    reviewerGuidance: text(2_000),
  }).optional(),
}).superRefine((question, context) => {
  if (question.questionType === "TEACH_BACK") {
    if (question.options.length !== 0) context.addIssue({ code: "custom", path: ["options"], message: "Teach-back cannot have multiple-choice options." });
    if (!question.rubric) context.addIssue({ code: "custom", path: ["rubric"], message: "Teach-back requires human-review guidance." });
  } else {
    if (question.options.length < 2) context.addIssue({ code: "custom", path: ["options"], message: "Choice questions require at least two options." });
    if (question.options.filter((option) => option.isCorrect).length !== 1) context.addIssue({ code: "custom", path: ["options"], message: "Choice questions require exactly one correct option." });
    if (question.questionType === "SCENARIO" && !question.scenarioText?.trim()) context.addIssue({ code: "custom", path: ["scenarioText"], message: "Scenario questions require a scenario." });
  }
});

export const questionPatchSchema = questionCreateSchema;

export const reviewSchema = z.object({
  decision: z.enum(["APPROVED", "REVISION_REQUESTED", "REJECTED"]),
  notes: z.string().trim().max(5_000).default(""),
});

export const attemptSchema = z.object({
  consentToStore: z.literal(true),
  responses: z.array(z.object({
    questionId: z.string().uuid(),
    selectedOptionId: z.string().uuid().optional(),
    textResponse: z.string().trim().max(4_000).optional(),
  }).refine((answer) => Boolean(answer.selectedOptionId) !== Boolean(answer.textResponse), "Choose one answer type for each question.")).min(1).max(100),
});

export const participantQuestionSchema = z.object({
  researchProjectId: z.string().uuid(),
  questionText: text(1_000),
  category: z.enum(["RESEARCH_PURPOSE", "RESEARCH_PROCEDURE", "POTENTIAL_BENEFITS", "POTENTIAL_RISKS", "PARTICIPANT_RIGHTS", "OTHER"]),
});

export const participantQuestionPatchSchema = z.object({ isCompleted: z.boolean() });

export const researchStageCreateSchema = z.object({
  title: text(200),
  description: text(2_000),
  stageOrder: z.number().int().min(1).max(100),
  estimatedDuration: z.string().trim().max(200).nullable().optional(),
  whatHappens: text(2_000),
  whyItMatters: text(2_000),
  possibleExperiences: text(2_000),
  participantRights: text(2_000),
});

export const researchStagePatchSchema = researchStageCreateSchema.partial();

export const learningProgressSchema = z.object({
  consentToStore: z.literal(true),
  educationalModuleId: z.string().uuid(),
  progressPercentage: z.number().min(0).max(100),
});

export const teachBackReviewSchema = z.object({
  awardedPoints: z.number().min(0).max(10),
  feedback: text(2_000),
}).strict();

export const userPreferencesSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  preferredLanguage: z.enum(["id", "en"]).optional(),
  accessibilityPreferences: z.object({
    fontScale: z.union([z.literal(1), z.literal(1.15)]).optional(),
    lowBandwidth: z.boolean().optional(),
  }).strict().optional(),
}).strict();
