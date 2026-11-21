import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse } from "@/lib/api/http";
import { requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
const MINIMUM_AGGREGATE_GROUP = 5;

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { id: institutionId } = await context.params;
    requireInstitutionRole(actor, institutionId, ["INSTITUTION_ADMIN", "RESEARCHER"]);
    const fromText = request.nextUrl.searchParams.get("from");
    const toText = request.nextUrl.searchParams.get("to");
    const parseDateBound = (value: string | null, endOfDay: boolean) => {
      if (!value) return undefined;
      const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
      const parsed = new Date(dateOnly ? `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z` : value);
      if (Number.isNaN(parsed.getTime()) || (dateOnly && parsed.toISOString().slice(0, 10) !== value)) return null;
      return parsed;
    };
    const from = parseDateBound(fromText, false);
    const to = parseDateBound(toText, true);
    if (from === null || to === null || (from && to && from > to)) {
      throw new ApiError(400, "Date filters must be valid ISO dates and from must be before to.", "INVALID_DATE_RANGE");
    }
    const dateFilter = from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};
    const where = { status: "COMPLETED" as const, ...dateFilter, assessment: { project: { institutionId } } };
    const [totalAttempts, completedAttempts] = await Promise.all([
      prisma.assessmentAttempt.count({ where: { ...dateFilter, assessment: { project: { institutionId } } } }),
      prisma.assessmentAttempt.findMany({ where, select: { participantId: true, percentageScore: true, assessment: { select: { assessmentType: true } } } }),
    ]);
    const scoredAttempts = completedAttempts.filter((row) => row.percentageScore !== null);
    const participantAverage = (rows: { participantId: string; percentageScore: number | null }[]) => {
      const scores = new Map<string, { total: number; count: number }>();
      for (const row of rows) {
        if (row.percentageScore === null) continue;
        const current = scores.get(row.participantId) ?? { total: 0, count: 0 };
        current.total += row.percentageScore;
        current.count += 1;
        scores.set(row.participantId, current);
      }
      const participantScores = [...scores.values()].map((value) => value.total / value.count);
      return participantScores.length ? participantScores.reduce((sum, score) => sum + score, 0) / participantScores.length : null;
    };
    const completedParticipantCount = new Set(scoredAttempts.map(({ participantId }) => participantId)).size;
    if (completedParticipantCount < MINIMUM_AGGREGATE_GROUP) {
      return apiResponse({
        institutionId,
        suppressed: true,
        minimumGroupSize: MINIMUM_AGGREGATE_GROUP,
        totalAttempts: "SUPPRESSED",
        completedParticipants: `<${MINIMUM_AGGREGATE_GROUP}`,
        message: "Aggregate values are hidden until the minimum group size is met.",
      });
    }
    const topicRows = await prisma.assessmentTopicResult.findMany({
      where: { attempt: { status: "COMPLETED", ...dateFilter, assessment: { project: { institutionId } } } },
      select: { categoryId: true, percentageScore: true, attempt: { select: { participantId: true } } },
    });
    const topicsByCategory = new Map<string, Map<string, { total: number; count: number }>>();
    for (const row of topicRows) {
      const people = topicsByCategory.get(row.categoryId) ?? new Map<string, { total: number; count: number }>();
      const person = people.get(row.attempt.participantId) ?? { total: 0, count: 0 };
      person.total += row.percentageScore;
      person.count += 1;
      people.set(row.attempt.participantId, person);
      topicsByCategory.set(row.categoryId, people);
    }
    const visibleCategoryIds = [...topicsByCategory.entries()].filter(([, people]) => people.size >= MINIMUM_AGGREGATE_GROUP).map(([categoryId]) => categoryId);
    const categories = await prisma.assessmentCategory.findMany({ where: { id: { in: visibleCategoryIds } }, select: { id: true, name: true, slug: true } });
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const topicMetrics = visibleCategoryIds.map((categoryId) => {
      const people = topicsByCategory.get(categoryId)!;
      const averageScore = [...people.values()].reduce((sum, value) => sum + value.total / value.count, 0) / people.size;
      return { ...categoryById.get(categoryId), averageScore, participantCount: people.size };
    }).sort((left, right) => left.averageScore - right.averageScore);
    const pairedScores = new Map<string, { pre: number[]; post: number[] }>();
    for (const row of scoredAttempts) {
      if (row.assessment.assessmentType !== "PRE_TEST" && row.assessment.assessmentType !== "POST_TEST") continue;
      const scores = pairedScores.get(row.participantId) ?? { pre: [], post: [] };
      if (row.assessment.assessmentType === "PRE_TEST") scores.pre.push(row.percentageScore!);
      else scores.post.push(row.percentageScore!);
      pairedScores.set(row.participantId, scores);
    }
    const paired = [...pairedScores.values()].filter((value) => value.pre.length && value.post.length).map((value) => ({
      pre: value.pre.reduce((sum, score) => sum + score, 0) / value.pre.length,
      post: value.post.reduce((sum, score) => sum + score, 0) / value.post.length,
    }));
    const pairedParticipantCount = paired.length;
    const preTestAverage = pairedParticipantCount ? paired.reduce((sum, item) => sum + item.pre, 0) / pairedParticipantCount : null;
    const postTestAverage = pairedParticipantCount ? paired.reduce((sum, item) => sum + item.post, 0) / pairedParticipantCount : null;
    const prePostComparison = pairedParticipantCount >= MINIMUM_AGGREGATE_GROUP
      ? {
          suppressed: false,
          pairedParticipants: pairedParticipantCount,
          preTest: { averageScore: preTestAverage },
          postTest: { averageScore: postTestAverage },
          averageChange: (postTestAverage ?? 0) - (preTestAverage ?? 0),
        }
      : {
          suppressed: true,
          pairedParticipants: `<${MINIMUM_AGGREGATE_GROUP}`,
        };
    const projects = await prisma.researchProject.count({ where: { institutionId } });
    const publishedProjects = await prisma.researchProject.count({ where: { institutionId, visibility: "PUBLIC", reviewStatus: "PUBLISHED" } });
    return apiResponse({
      institutionId,
      suppressed: false,
      minimumGroupSize: MINIMUM_AGGREGATE_GROUP,
      totalAttempts,
      completedAttempts: completedAttempts.length,
      completedParticipants: completedParticipantCount,
      completionRate: totalAttempts ? completedAttempts.length / totalAttempts : 0,
      averageScore: participantAverage(scoredAttempts),
      topicMetrics,
      suppressedTopicMetrics: topicsByCategory.size - visibleCategoryIds.length,
      prePostComparison,
      projects: { total: projects, published: publishedProjects },
      participationDecision: "NOT_USED",
    });
  } catch (error) {
    return apiError(error);
  }
}
