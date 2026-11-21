import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { getOptionalActor, hasInstitutionAccess, hasRole, requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { modulePatchSchema } from "@/lib/api/schemas";
import { toInputJson } from "@/lib/api/content";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const module = await prisma.educationalModule.findUnique({ where: { id }, include: { project: { select: { institutionId: true, visibility: true, reviewStatus: true } } } });
    if (!module) throw new ApiError(404, "Educational module not found.", "MODULE_NOT_FOUND");
    const actor = await getOptionalActor(request);
    const isPublic = module.status === "PUBLISHED" && (!module.project || (module.project.visibility === "PUBLIC" && module.project.reviewStatus === "PUBLISHED"));
    const canViewPrivate = Boolean(actor && module.project && hasInstitutionAccess(actor, module.project.institutionId)
      && (hasRole(actor, "SUPER_ADMIN") || hasRole(actor, "INSTITUTION_ADMIN", module.project.institutionId) || hasRole(actor, "RESEARCHER", module.project.institutionId) || hasRole(actor, "CLINICAL_REVIEWER", module.project.institutionId)));
    if (!isPublic && !canViewPrivate) throw new ApiError(404, "Educational module not found.", "MODULE_NOT_FOUND");
    const { project: _project, createdById: _createdById, ...visible } = module;
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
    const module = await prisma.educationalModule.findUnique({ where: { id }, include: { project: true } });
    if (!module) throw new ApiError(404, "Educational module not found.", "MODULE_NOT_FOUND");
    if (!module.project) throw new ApiError(409, "Global modules require a separate super-admin workflow.", "GLOBAL_MODULE_READ_ONLY");
    requireInstitutionRole(actor, module.project.institutionId, ["INSTITUTION_ADMIN", "RESEARCHER"]);
    if (actor.id !== module.createdById && !hasRole(actor, "SUPER_ADMIN") && !hasRole(actor, "INSTITUTION_ADMIN", module.project.institutionId)) {
      throw new ApiError(403, "Only the module owner or an institution administrator can edit this module.", "CONTENT_EDIT_DENIED");
    }
    if (module.status === "SUBMITTED_FOR_REVIEW" || module.status === "ARCHIVED") throw new ApiError(409, "This module cannot be edited in its current workflow state.", "INVALID_WORKFLOW_STATE");
    const body = await readJson(request, modulePatchSchema);
    if (!Object.keys(body).length) throw new ApiError(400, "At least one module field is required.", "EMPTY_UPDATE");
    const duplicate = body.slug && body.slug !== module.slug
      ? await prisma.educationalModule.findFirst({ where: { researchProjectId: module.researchProjectId, slug: body.slug, id: { not: id } }, select: { id: true } })
      : null;
    if (duplicate) throw new ApiError(409, "A module with this slug already exists for the project.", "MODULE_SLUG_CONFLICT");
    const latestVersion = (await prisma.contentVersion.aggregate({ where: { educationalModuleId: id }, _max: { versionNumber: true } }))._max.versionNumber ?? 0;
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.educationalModule.update({ where: { id }, data: { ...body, status: "DRAFT" } });
      await tx.contentVersion.create({ data: { educationalModuleId: id, versionNumber: latestVersion + 1, contentSnapshot: toInputJson(body), changeDescription: "Updated module draft; review is required again.", createdById: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: module.project!.institutionId, action: "UPDATE_EDUCATIONAL_MODULE", resourceType: "EducationalModule", resourceId: id } });
      return saved;
    });
    return apiResponse(updated);
  } catch (error) {
    return apiError(error);
  }
}
