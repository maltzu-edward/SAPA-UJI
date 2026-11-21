import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { getOptionalActor, hasInstitutionAccess, hasRole, requireActor } from "@/lib/api/auth";
import { requireProjectEditor, toInputJson } from "@/lib/api/content";
import { projectPatchSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const project = await prisma.researchProject.findUnique({ where: { id }, include: { stages: { orderBy: { stageOrder: "asc" } } } });
    if (!project) throw new ApiError(404, "Research project not found.", "PROJECT_NOT_FOUND");
    const actor = await getOptionalActor(request);
    const isPublic = project.visibility === "PUBLIC" && project.reviewStatus === "PUBLISHED";
    const canViewPrivate = actor && hasInstitutionAccess(actor, project.institutionId)
      && (hasRole(actor, "SUPER_ADMIN") || hasRole(actor, "INSTITUTION_ADMIN", project.institutionId) || hasRole(actor, "RESEARCHER", project.institutionId) || hasRole(actor, "CLINICAL_REVIEWER", project.institutionId));
    if (!isPublic && !canViewPrivate) throw new ApiError(404, "Research project not found.", "PROJECT_NOT_FOUND");
    const { createdById: _createdById, ...visible } = project;
    return apiResponse(visible);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const { id } = await context.params;
    const project = await prisma.researchProject.findUnique({ where: { id } });
    if (!project) throw new ApiError(404, "Research project not found.", "PROJECT_NOT_FOUND");
    await requireProjectEditor(actor, project);
    if (project.reviewStatus === "SUBMITTED_FOR_REVIEW" || project.reviewStatus === "ARCHIVED") {
      throw new ApiError(409, "This project cannot be edited in its current workflow state.", "INVALID_WORKFLOW_STATE");
    }
    const body = await readJson(request, projectPatchSchema);
    if (!Object.keys(body).length) throw new ApiError(400, "At least one project field is required.", "EMPTY_UPDATE");
    if (body.slug && body.slug !== project.slug) {
      const duplicate = await prisma.researchProject.findFirst({ where: { institutionId: project.institutionId, slug: body.slug, id: { not: id } }, select: { id: true } });
      if (duplicate) throw new ApiError(409, "A project with this slug already exists in the institution.", "PROJECT_SLUG_CONFLICT");
    }
    const latestVersion = (await prisma.contentVersion.aggregate({ where: { researchProjectId: id }, _max: { versionNumber: true } }))._max.versionNumber ?? 0;
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.researchProject.update({
        where: { id },
        data: { ...body, reviewStatus: "DRAFT", visibility: "PRIVATE", publishedAt: null, archivedAt: null },
      });
      await tx.contentVersion.create({
        data: {
          researchProjectId: id,
          versionNumber: latestVersion + 1,
          contentSnapshot: toInputJson(body),
          changeDescription: "Updated project draft; review is required again.",
          createdById: actor.id,
        },
      });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: project.institutionId, action: "UPDATE_RESEARCH_PROJECT", resourceType: "ResearchProject", resourceId: id } });
      return saved;
    });
    return apiResponse(updated);
  } catch (error) {
    return apiError(error);
  }
}
