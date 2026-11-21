import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { getOptionalActor, hasInstitutionAccess, hasRole, requireActor } from "@/lib/api/auth";
import { requireProjectEditor, toInputJson } from "@/lib/api/content";
import { researchStageCreateSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const project = await prisma.researchProject.findUnique({ where: { id }, select: { id: true, institutionId: true, visibility: true, reviewStatus: true } });
    if (!project) throw new ApiError(404, "Research project not found.", "PROJECT_NOT_FOUND");
    const actor = await getOptionalActor(request);
    const isPublic = project.visibility === "PUBLIC" && project.reviewStatus === "PUBLISHED";
    const canViewPrivate = Boolean(actor && hasInstitutionAccess(actor, project.institutionId)
      && (hasRole(actor, "SUPER_ADMIN") || hasRole(actor, "INSTITUTION_ADMIN", project.institutionId) || hasRole(actor, "RESEARCHER", project.institutionId) || hasRole(actor, "CLINICAL_REVIEWER", project.institutionId)));
    if (!isPublic && !canViewPrivate) throw new ApiError(404, "Research project not found.", "PROJECT_NOT_FOUND");
    const items = await prisma.researchStage.findMany({ where: { researchProjectId: id }, orderBy: { stageOrder: "asc" } });
    return apiResponse({ items });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const body = await readJson(request, researchStageCreateSchema);
    const { id } = await context.params;
    const project = await prisma.researchProject.findUnique({ where: { id } });
    if (!project) throw new ApiError(404, "Research project not found.", "PROJECT_NOT_FOUND");
    await requireProjectEditor(actor, project);
    if (project.reviewStatus === "SUBMITTED_FOR_REVIEW" || project.reviewStatus === "ARCHIVED") throw new ApiError(409, "Stages cannot be edited in the current project workflow state.", "INVALID_WORKFLOW_STATE");
    const duplicate = await prisma.researchStage.findFirst({ where: { researchProjectId: id, stageOrder: body.stageOrder }, select: { id: true } });
    if (duplicate) throw new ApiError(409, "That stage order is already in use.", "STAGE_ORDER_CONFLICT");
    const latestVersion = (await prisma.contentVersion.aggregate({ where: { researchProjectId: id }, _max: { versionNumber: true } }))._max.versionNumber ?? 0;
    const saved = await prisma.$transaction(async (tx) => {
      const stage = await tx.researchStage.create({ data: { ...body, estimatedDuration: body.estimatedDuration ?? null, researchProjectId: id } });
      await tx.researchProject.update({ where: { id }, data: { reviewStatus: "DRAFT", visibility: "PRIVATE", publishedAt: null } });
      await tx.contentVersion.create({ data: { researchProjectId: id, versionNumber: latestVersion + 1, contentSnapshot: toInputJson({ stageChange: "CREATE", stage: body }), changeDescription: `Added research journey stage ${body.stageOrder}.`, createdById: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: project.institutionId, action: "CREATE_RESEARCH_STAGE", resourceType: "ResearchStage", resourceId: stage.id } });
      return stage;
    });
    return apiResponse(saved, 201);
  } catch (error) {
    return apiError(error);
  }
}
