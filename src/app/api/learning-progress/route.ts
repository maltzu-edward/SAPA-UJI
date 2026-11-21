import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, queryNumber, readJson, requireSameOrigin } from "@/lib/api/http";
import { hasInstitutionAccess, hasRole, requireActor } from "@/lib/api/auth";
import { learningProgressSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const limit = queryNumber(request.nextUrl.searchParams.get("limit"), 50, 1, 100);
    const offset = queryNumber(request.nextUrl.searchParams.get("offset"), 0, 0, 10_000);
    const [rows, total] = await prisma.$transaction([
      prisma.learningProgress.findMany({
        where: { participantId: actor.id },
        orderBy: { lastAccessedAt: "desc" },
        skip: offset,
        take: limit,
        include: { module: { include: { project: { select: { id: true, institutionId: true, visibility: true, reviewStatus: true } } } } },
      }),
      prisma.learningProgress.count({ where: { participantId: actor.id } }),
    ]);
    const items = rows.filter(({ module }) => module.status === "PUBLISHED"
      && (!module.project || (module.project.visibility === "PUBLIC" && module.project.reviewStatus === "PUBLISHED")))
      .map(({ module, ...progress }) => ({ ...progress, module: { id: module.id, title: module.title, slug: module.slug, researchProjectId: module.researchProjectId } }));
    return apiResponse({ items, total, limit, offset });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const body = await readJson(request, learningProgressSchema);
    const educationalModule = await prisma.educationalModule.findUnique({ where: { id: body.educationalModuleId }, include: { project: true } });
    if (!educationalModule || educationalModule.status !== "PUBLISHED" || (educationalModule.project && (educationalModule.project.visibility !== "PUBLIC" || educationalModule.project.reviewStatus !== "PUBLISHED"))) {
      throw new ApiError(404, "Published educational module not found.", "MODULE_NOT_FOUND");
    }
    if (educationalModule.project) {
      if (!hasInstitutionAccess(actor, educationalModule.project.institutionId) || !hasRole(actor, "PARTICIPANT", educationalModule.project.institutionId)) {
        throw new ApiError(403, "An active participant account for this institution is required.", "PARTICIPANT_ACCESS_REQUIRED");
      }
    } else if (!actor.roles.some(({ role }) => role === "PARTICIPANT")) {
      throw new ApiError(403, "A participant account is required to save learning progress.", "PARTICIPANT_ACCESS_REQUIRED");
    }
    const now = new Date();
    const completedAt = body.progressPercentage >= 100 ? now : null;
    const progress = await prisma.learningProgress.upsert({
      where: { participantId_educationalModuleId: { participantId: actor.id, educationalModuleId: educationalModule.id } },
      create: { participantId: actor.id, educationalModuleId: educationalModule.id, progressPercentage: body.progressPercentage, completedAt, lastAccessedAt: now },
      update: { progressPercentage: body.progressPercentage, completedAt, lastAccessedAt: now },
      select: { id: true, educationalModuleId: true, progressPercentage: true, startedAt: true, completedAt: true, lastAccessedAt: true },
    });
    return apiResponse(progress);
  } catch (error) {
    return apiError(error);
  }
}
