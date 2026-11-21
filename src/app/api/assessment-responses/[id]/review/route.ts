import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { teachBackReviewSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const body = await readJson(request, teachBackReviewSchema);
    const { id } = await context.params;
    const response = await prisma.assessmentResponse.findUnique({
      where: { id },
      include: {
        attempt: { include: { assessment: { include: { project: true } } } },
        question: { include: { category: true, rubric: true } },
      },
    });
    if (!response) throw new ApiError(404, "Assessment response not found.", "RESPONSE_NOT_FOUND");
    const { assessment } = response.attempt;
    const institutionId = assessment.project.institutionId;
    requireInstitutionRole(actor, institutionId, ["CLINICAL_REVIEWER"]);
    if (assessment.createdById === actor.id) throw new ApiError(403, "Authors cannot review teach-back responses for their own assessment.", "SELF_REVIEW_DENIED");
    if (response.attempt.participantId === actor.id) throw new ApiError(403, "Participants cannot review their own teach-back responses.", "SELF_REVIEW_DENIED");
    if (response.question.questionType !== "TEACH_BACK" || !response.textResponse || !response.question.rubric) {
      throw new ApiError(409, "Only teach-back responses with a review rubric can be reviewed here.", "NOT_A_TEACH_BACK_RESPONSE");
    }
    if (response.reviewStatus !== "PENDING_HUMAN_REVIEW") throw new ApiError(409, "This response has already been reviewed.", "RESPONSE_ALREADY_REVIEWED");
    if (body.awardedPoints > response.question.points) throw new ApiError(400, "Awarded points cannot exceed the rubric maximum.", "POINTS_EXCEED_MAXIMUM");

    const result = await prisma.$transaction(async (tx) => {
      await tx.assessmentResponse.update({
        where: { id },
        data: { awardedPoints: body.awardedPoints, maximumPoints: response.question.points, feedback: body.feedback, reviewedById: actor.id, reviewStatus: "REVIEWED" },
      });
      const reviewedResponses = await tx.assessmentResponse.findMany({
        where: { attemptId: response.attemptId, reviewStatus: { in: ["NOT_REQUIRED", "REVIEWED"] } },
        include: { question: { include: { category: true } } },
      });
      const totalScore = reviewedResponses.reduce((sum, item) => sum + item.awardedPoints, 0);
      const maximumScore = reviewedResponses.reduce((sum, item) => sum + item.maximumPoints, 0);
      const percentageScore = maximumScore ? (totalScore / maximumScore) * 100 : null;
      await tx.assessmentAttempt.update({ where: { id: response.attemptId }, data: { totalScore, maximumScore, percentageScore } });
      const pendingTeachBackCount = await tx.assessmentResponse.count({ where: { attemptId: response.attemptId, reviewStatus: "PENDING_HUMAN_REVIEW" } });

      const topicGroups = new Map<string, { categoryId: string; slug: string; name: string; totalScore: number; maxScore: number; total: number; understood: number }>();
      for (const item of reviewedResponses) {
        const group = topicGroups.get(item.question.categoryId) ?? { categoryId: item.question.categoryId, slug: item.question.category.slug, name: item.question.category.name, totalScore: 0, maxScore: 0, total: 0, understood: 0 };
        group.totalScore += item.awardedPoints;
        group.maxScore += item.maximumPoints;
        group.total += 1;
        if (item.maximumPoints > 0 && item.awardedPoints / item.maximumPoints >= 0.7) group.understood += 1;
        topicGroups.set(item.question.categoryId, group);
      }
      await tx.assessmentTopicResult.deleteMany({ where: { attemptId: response.attemptId } });
      await tx.educationalFeedback.deleteMany({ where: { assessmentAttemptId: response.attemptId } });
      for (const group of topicGroups.values()) {
        const score = group.maxScore ? (group.totalScore / group.maxScore) * 100 : 0;
        await tx.assessmentTopicResult.create({
          data: {
            attemptId: response.attemptId,
            categoryId: group.categoryId,
            correctAnswers: group.understood,
            totalQuestions: group.total,
            percentageScore: score,
            comprehensionStatus: score >= 70 ? "RELATIVE_UNDERSTANDING" : "MAY_NEED_REINFORCEMENT",
          },
        });
        if (score < 70) {
          const recommendedModule = await tx.educationalModule.findFirst({ where: { researchProjectId: assessment.researchProjectId, slug: group.slug, status: "PUBLISHED" }, select: { id: true } });
          await tx.educationalFeedback.create({
            data: {
              participantId: response.attempt.participantId,
              assessmentAttemptId: response.attemptId,
              categoryId: group.categoryId,
              feedbackText: `${group.name} may benefit from another explanation or a conversation with the research team. This is an educational suggestion and does not affect participation eligibility.`,
              recommendedModuleId: recommendedModule?.id ?? null,
            },
          });
        }
      }
      await tx.auditLog.create({
        data: { actorId: actor.id, institutionId, action: "REVIEW_TEACH_BACK_RESPONSE", resourceType: "AssessmentResponse", resourceId: id, metadata: { awardedPoints: body.awardedPoints, maximumPoints: response.question.points } },
      });
      return { totalScore, maximumScore, percentageScore, pendingTeachBackCount, topicResults: [...topicGroups.values()].map((group) => ({ categoryId: group.categoryId, totalQuestions: group.total, percentageScore: group.maxScore ? (group.totalScore / group.maxScore) * 100 : 0 })) };
    });
    return apiResponse({ responseId: id, reviewStatus: "REVIEWED", feedback: body.feedback, ...result, scoreStatus: result.pendingTeachBackCount ? "PROVISIONAL_PENDING_HUMAN_REVIEW" : "FINAL_WITH_HUMAN_REVIEW", participationDecision: "NOT_USED" });
  } catch (error) {
    return apiError(error);
  }
}
