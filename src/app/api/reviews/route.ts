import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiResponse, queryNumber } from "@/lib/api/http";
import { requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const institutionId = request.nextUrl.searchParams.get("institutionId");
    if (!institutionId || !z.string().uuid().safeParse(institutionId).success) throw new ApiError(400, "A valid institutionId query parameter is required.", "INVALID_QUERY");
    requireInstitutionRole(actor, institutionId, ["CLINICAL_REVIEWER"]);
    const limit = queryNumber(request.nextUrl.searchParams.get("limit"), 50, 1, 100);
    const [projects, modules, assessments, teachBackResponses] = await Promise.all([
      prisma.researchProject.findMany({ where: { institutionId, reviewStatus: "SUBMITTED_FOR_REVIEW", createdById: { not: actor.id } }, orderBy: { updatedAt: "asc" }, take: limit, select: { id: true, title: true, updatedAt: true, creator: { select: { name: true } } } }),
      prisma.educationalModule.findMany({ where: { status: "SUBMITTED_FOR_REVIEW", createdById: { not: actor.id }, project: { is: { institutionId } } }, orderBy: { updatedAt: "asc" }, take: limit, select: { id: true, title: true, updatedAt: true, creator: { select: { name: true } }, project: { select: { title: true } } } }),
      prisma.assessment.findMany({ where: { status: "SUBMITTED_FOR_REVIEW", createdById: { not: actor.id }, project: { is: { institutionId } } }, orderBy: { updatedAt: "asc" }, take: limit, select: { id: true, title: true, updatedAt: true, creator: { select: { name: true } }, project: { select: { title: true } } } }),
      prisma.assessmentResponse.findMany({
        where: { reviewStatus: "PENDING_HUMAN_REVIEW", attempt: { participantId: { not: actor.id }, assessment: { createdById: { not: actor.id }, project: { institutionId } } } },
        orderBy: { createdAt: "asc" },
        take: limit,
        select: { id: true, textResponse: true, maximumPoints: true, createdAt: true, question: { select: { questionText: true, rubric: true, category: { select: { name: true, slug: true } } } } },
      }),
    ]);
    const items = [
      ...projects.map((item) => ({ id: item.id, type: "RESEARCH_PROJECT", title: item.title, authorName: item.creator.name, submittedAt: item.updatedAt })),
      ...modules.map((item) => ({ id: item.id, type: "EDUCATIONAL_MODULE", title: item.title, projectTitle: item.project?.title, authorName: item.creator.name, submittedAt: item.updatedAt })),
      ...assessments.map((item) => ({ id: item.id, type: "ASSESSMENT", title: item.title, projectTitle: item.project.title, authorName: item.creator.name, submittedAt: item.updatedAt })),
      ...teachBackResponses.map((item) => ({ id: item.id, type: "TEACH_BACK_RESPONSE", responseText: item.textResponse, maximumPoints: item.maximumPoints, question: item.question.questionText, rubric: item.question.rubric, topic: item.question.category, submittedAt: item.createdAt })),
    ].sort((left, right) => right.submittedAt.getTime() - left.submittedAt.getTime()).slice(0, limit);
    return apiResponse({ items, limit });
  } catch (error) {
    return apiError(error);
  }
}
