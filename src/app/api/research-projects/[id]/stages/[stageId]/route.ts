import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { requireActor } from "@/lib/api/auth";
import { requireProjectEditor, toInputJson } from "@/lib/api/content";
import { researchStagePatchSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string; stageId: string }> };

async function loadStage(projectId: string, stageId: string) {
  const stage = await prisma.researchStage.findUnique({ where: { id: stageId }, include: { project: true } });
  if (!stage || stage.researchProjectId !== projectId) throw new ApiError(404, "Research journey stage not found.", "STAGE_NOT_FOUND");
  return stage;
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const { id, stageId } = await context.params;
    const stage = await loadStage(id, stageId);
    await requireProjectEditor(actor, stage.project);
    if (stage.project.reviewStatus === "SUBMITTED_FOR_REVIEW" || stage.project.reviewStatus === "ARCHIVED") throw new ApiError(409, "Stages cannot be edited in the current project workflow state.", "INVALID_WORKFLOW_STATE");
    const body = await readJson(request, researchStagePatchSchema);
    if (!Object.keys(body).length) throw new ApiError(400, "At least one stage field is required.", "EMPTY_UPDATE");
    if (body.stageOrder !== undefined) {
      const duplicate = await prisma.researchStage.findFirst({ where: { researchProjectId: id, stageOrder: body.stageOrder, id: { not: stageId } }, select: { id: true } });
      if (duplicate) throw new ApiError(409, "That stage order is already in use.", "STAGE_ORDER_CONFLICT");
    }
    const latestVersion = (await prisma.contentVersion.aggregate({ where: { researchProjectId: id }, _max: { versionNumber: true } }))._max.versionNumber ?? 0;
    const saved = await prisma.$transaction(async (tx) => {
      const updated = await tx.researchStage.update({ where: { id: stageId }, data: body });
      await tx.researchProject.update({ where: { id }, data: { reviewStatus: "DRAFT", visibility: "PRIVATE", publishedAt: null } });
      await tx.contentVersion.create({ data: { researchProjectId: id, versionNumber: latestVersion + 1, contentSnapshot: toInputJson({ stageChange: "UPDATE", stageId, changes: body }), changeDescription: "Updated research journey stage; project review is required again.", createdById: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: stage.project.institutionId, action: "UPDATE_RESEARCH_STAGE", resourceType: "ResearchStage", resourceId: stageId } });
      return updated;
    });
    return apiResponse(saved);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const { id, stageId } = await context.params;
    const stage = await loadStage(id, stageId);
    await requireProjectEditor(actor, stage.project);
    if (stage.project.reviewStatus === "SUBMITTED_FOR_REVIEW" || stage.project.reviewStatus === "ARCHIVED") throw new ApiError(409, "Stages cannot be edited in the current project workflow state.", "INVALID_WORKFLOW_STATE");
    const latestVersion = (await prisma.contentVersion.aggregate({ where: { researchProjectId: id }, _max: { versionNumber: true } }))._max.versionNumber ?? 0;
    await prisma.$transaction(async (tx) => {
      await tx.researchStage.delete({ where: { id: stageId } });
      await tx.researchProject.update({ where: { id }, data: { reviewStatus: "DRAFT", visibility: "PRIVATE", publishedAt: null } });
      await tx.contentVersion.create({ data: { researchProjectId: id, versionNumber: latestVersion + 1, contentSnapshot: toInputJson({ stageChange: "DELETE", stage }), changeDescription: "Removed research journey stage; project review is required again.", createdById: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: stage.project.institutionId, action: "DELETE_RESEARCH_STAGE", resourceType: "ResearchStage", resourceId: stageId } });
    });
    return apiResponse({ deleted: true, id: stageId });
  } catch (error) {
    return apiError(error);
  }
}
