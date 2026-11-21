import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, queryNumber, readJson, requireSameOrigin } from "@/lib/api/http";
import { hasInstitutionAccess, hasRole, requireActor } from "@/lib/api/auth";
import { participantQuestionSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const projectId = request.nextUrl.searchParams.get("researchProjectId") || undefined;
    const limit = queryNumber(request.nextUrl.searchParams.get("limit"), 50, 1, 100);
    const offset = queryNumber(request.nextUrl.searchParams.get("offset"), 0, 0, 10_000);
    const items = await prisma.participantQuestion.findMany({
      where: { participantId: actor.id, ...(projectId ? { researchProjectId: projectId } : {}) },
      orderBy: { createdAt: "desc" }, skip: offset, take: limit,
      select: { id: true, researchProjectId: true, questionText: true, category: true, isCompleted: true, createdAt: true, updatedAt: true },
    });
    return apiResponse({ items, limit, offset });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const body = await readJson(request, participantQuestionSchema);
    const project = await prisma.researchProject.findUnique({ where: { id: body.researchProjectId }, select: { id: true, institutionId: true, visibility: true, reviewStatus: true } });
    if (!project || project.visibility !== "PUBLIC" || project.reviewStatus !== "PUBLISHED") throw new ApiError(404, "Published research project not found.", "PROJECT_NOT_FOUND");
    if (!hasInstitutionAccess(actor, project.institutionId) || !hasRole(actor, "PARTICIPANT", project.institutionId)) {
      throw new ApiError(403, "An active participant account for this institution is required.", "PARTICIPANT_ACCESS_REQUIRED");
    }
    const result = await prisma.$transaction(async (tx) => {
      const question = await tx.participantQuestion.create({ data: { participantId: actor.id, researchProjectId: project.id, questionText: body.questionText, category: body.category } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: project.institutionId, action: "CREATE_PARTICIPANT_QUESTION", resourceType: "ParticipantQuestion", resourceId: question.id } });
      return question;
    });
    return apiResponse({ id: result.id, researchProjectId: result.researchProjectId, questionText: result.questionText, category: result.category, createdAt: result.createdAt }, 201);
  } catch (error) {
    return apiError(error);
  }
}
