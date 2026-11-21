import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { hasInstitutionAccess, hasRole, requireActor } from "@/lib/api/auth";
import { attemptSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { id } = await context.params;
    const attempts = await prisma.assessmentAttempt.findMany({
      where: { assessmentId: id, participantId: actor.id },
      orderBy: { attemptNumber: "desc" },
      select: { id: true, attemptNumber: true, startedAt: true, completedAt: true, totalScore: true, maximumScore: true, percentageScore: true, status: true, topicResults: { include: { category: { select: { slug: true, name: true } } } }, responses: { select: { reviewStatus: true } } },
    });
    return apiResponse({ items: attempts.map(({ responses, ...attempt }) => ({
      ...attempt,
      teachBackReviewStatus: responses.some(({ reviewStatus }) => reviewStatus === "PENDING_HUMAN_REVIEW")
        ? "PENDING_HUMAN_REVIEW"
        : responses.some(({ reviewStatus }) => reviewStatus === "REVIEWED") ? "REVIEWED" : "NOT_SUBMITTED",
    })) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const { id: assessmentId } = await context.params;
    const body = await readJson(request, attemptSchema);
    const questionIds = body.responses.map((answer) => answer.questionId);
    if (new Set(questionIds).size !== questionIds.length) throw new ApiError(400, "Each question can appear only once per attempt.", "DUPLICATE_ANSWERS");

    const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, include: { project: true } });
    if (!assessment || assessment.status !== "PUBLISHED" || assessment.project.visibility !== "PUBLIC" || assessment.project.reviewStatus !== "PUBLISHED") {
      throw new ApiError(404, "Published assessment not found.", "ASSESSMENT_NOT_FOUND");
    }
    if (!hasInstitutionAccess(actor, assessment.project.institutionId) || !hasRole(actor, "PARTICIPANT", assessment.project.institutionId)) {
      throw new ApiError(403, "An active participant account for this institution is required.", "PARTICIPANT_ACCESS_REQUIRED");
    }
    const questions = await prisma.question.findMany({
      where: { assessmentId, status: "PUBLISHED" },
      include: { category: true, options: true, rubric: true },
    });
    if (questions.length !== questionIds.length || questions.some((question) => !questionIds.includes(question.id))) {
      throw new ApiError(400, "Answer every published question once before submitting the assessment.", "ASSESSMENT_INCOMPLETE");
    }
    const questionById = new Map(questions.map((question) => [question.id, question]));
    const computed = body.responses.map((answer) => {
      const question = questionById.get(answer.questionId)!;
      if (question.questionType === "TEACH_BACK") {
        if (!answer.textResponse || answer.selectedOptionId) throw new ApiError(400, "Teach-back answers must be free text.", "INVALID_TEACH_BACK_RESPONSE");
        return { answer, question, selectedOptionId: null as string | null, points: 0, maximumPoints: question.points, correct: false, teachBack: true };
      }
      if (!answer.selectedOptionId || answer.textResponse) throw new ApiError(400, "Choice questions require a selected option.", "INVALID_CHOICE_RESPONSE");
      const option = question.options.find((candidate) => candidate.id === answer.selectedOptionId);
      if (!option) throw new ApiError(400, "A selected option does not belong to its question.", "INVALID_OPTION");
      return { answer, question, selectedOptionId: option.id, points: option.isCorrect ? question.points : 0, maximumPoints: question.points, correct: option.isCorrect, teachBack: false };
    });
    const scored = computed.filter((item) => !item.teachBack);
    const totalScore = scored.reduce((sum, item) => sum + item.points, 0);
    const maximumScore = scored.reduce((sum, item) => sum + item.maximumPoints, 0);
    const percentageScore = maximumScore > 0 ? (totalScore / maximumScore) * 100 : null;
    const grouped = new Map<string, { categoryId: string; name: string; slug: string; correct: number; total: number }>();
    for (const item of scored) {
      const group = grouped.get(item.question.categoryId) ?? { categoryId: item.question.categoryId, name: item.question.category.name, slug: item.question.category.slug, correct: 0, total: 0 };
      group.total += 1;
      if (item.correct) group.correct += 1;
      grouped.set(item.question.categoryId, group);
    }
    const topicResults = [...grouped.values()].map((item) => ({
      ...item,
      percentageScore: item.total ? (item.correct / item.total) * 100 : 0,
      comprehensionStatus: item.total && item.correct === item.total ? "RELATIVE_UNDERSTANDING" : "MAY_NEED_REINFORCEMENT",
    }));
    const previous = await prisma.assessmentAttempt.aggregate({ where: { assessmentId, participantId: actor.id }, _max: { attemptNumber: true } });
    const attemptNumber = (previous._max.attemptNumber ?? 0) + 1;
    const completedAt = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const attempt = await tx.assessmentAttempt.create({
        data: { assessmentId, participantId: actor.id, attemptNumber, startedAt: completedAt, completedAt, totalScore, maximumScore, percentageScore, status: "COMPLETED" },
      });
      for (const item of computed) {
        await tx.assessmentResponse.create({
          data: {
            attemptId: attempt.id,
            questionId: item.question.id,
            selectedOptionId: item.selectedOptionId,
            textResponse: item.teachBack ? item.answer.textResponse : null,
            awardedPoints: item.points,
            maximumPoints: item.maximumPoints,
            feedback: item.teachBack ? "Teach-back requires human review; it is not automatically scored." : item.question.explanation,
            reviewStatus: item.teachBack ? "PENDING_HUMAN_REVIEW" : "NOT_REQUIRED",
          },
        });
      }
      for (const topic of topicResults) {
        await tx.assessmentTopicResult.create({
          data: { attemptId: attempt.id, categoryId: topic.categoryId, correctAnswers: topic.correct, totalQuestions: topic.total, percentageScore: topic.percentageScore, comprehensionStatus: topic.comprehensionStatus },
        });
        if (topic.percentageScore < 70) {
          const moduleSlug = topic.slug;
          const recommendedModule = await tx.educationalModule.findFirst({ where: { researchProjectId: assessment.project.id, slug: moduleSlug, status: "PUBLISHED" }, select: { id: true } });
          await tx.educationalFeedback.create({
            data: {
              participantId: actor.id,
              assessmentAttemptId: attempt.id,
              categoryId: topic.categoryId,
              feedbackText: `${topic.name} may benefit from another explanation or a conversation with the research team. This is an educational suggestion and does not affect participation eligibility.`,
              recommendedModuleId: recommendedModule?.id ?? null,
            },
          });
        }
      }
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: assessment.project.institutionId, action: "COMPLETE_ASSESSMENT", resourceType: "AssessmentAttempt", resourceId: attempt.id, metadata: { responseCount: computed.length, containsTeachBack: computed.some((item) => item.teachBack) } } });
      return attempt;
    });
    return apiResponse({
      id: result.id,
      attemptNumber: result.attemptNumber,
      completedAt: result.completedAt,
      totalScore: result.totalScore,
      maximumScore: result.maximumScore,
      percentageScore: result.percentageScore,
      topicResults: topicResults.map(({ categoryId, name, slug, correct, total, percentageScore: topicScore, comprehensionStatus }) => ({ categoryId, name, slug, correctAnswers: correct, totalQuestions: total, percentageScore: topicScore, comprehensionStatus })),
      teachBack: computed.some((item) => item.teachBack) ? "PENDING_HUMAN_REVIEW" : "NOT_SUBMITTED",
      scoreStatus: computed.some((item) => item.teachBack) ? "PROVISIONAL_PENDING_HUMAN_REVIEW" : "LEARNING_FEEDBACK_ONLY",
      participationDecision: "NOT_USED",
    }, 201);
  } catch (error) {
    return apiError(error);
  }
}
