import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, queryNumber, readJson, requireSameOrigin } from "@/lib/api/http";
import { getOptionalActor, hasInstitutionAccess, hasRole, requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { moduleCreateSchema } from "@/lib/api/schemas";
import { toInputJson } from "@/lib/api/content";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const actor = await getOptionalActor(request);
    const search = request.nextUrl.searchParams;
    const projectId = search.get("researchProjectId") || undefined;
    const limit = queryNumber(search.get("limit"), 30, 1, 100);
    const offset = queryNumber(search.get("offset"), 0, 0, 10_000);
    let where: Prisma.EducationalModuleWhereInput = { researchProjectId: projectId ?? null, status: "PUBLISHED" };
    if (projectId) {
      const project = await prisma.researchProject.findUnique({ where: { id: projectId }, select: { id: true, institutionId: true, visibility: true, reviewStatus: true } });
      if (!project) throw new ApiError(404, "Research project not found.", "PROJECT_NOT_FOUND");
      const hasAccess = Boolean(actor && hasInstitutionAccess(actor, project.institutionId)
        && (hasRole(actor, "SUPER_ADMIN") || hasRole(actor, "INSTITUTION_ADMIN", project.institutionId) || hasRole(actor, "RESEARCHER", project.institutionId) || hasRole(actor, "CLINICAL_REVIEWER", project.institutionId)));
      if (actor && hasAccess && (hasRole(actor, "SUPER_ADMIN") || hasRole(actor, "INSTITUTION_ADMIN", project.institutionId) || hasRole(actor, "RESEARCHER", project.institutionId))) {
        where = { researchProjectId: projectId };
      } else if (actor && hasAccess && hasRole(actor, "CLINICAL_REVIEWER", project.institutionId)) {
        where = { researchProjectId: projectId, status: "SUBMITTED_FOR_REVIEW" };
      } else if (project.visibility !== "PUBLIC" || project.reviewStatus !== "PUBLISHED") {
        throw new ApiError(404, "Research project not found.", "PROJECT_NOT_FOUND");
      }
    }
    const [items, total] = await prisma.$transaction([
      prisma.educationalModule.findMany({ where, orderBy: [{ orderIndex: "asc" }, { updatedAt: "desc" }], skip: offset, take: limit, select: { id: true, researchProjectId: true, title: true, slug: true, summary: true, content: true, sourceReference: true, contentType: true, language: true, estimatedReadingTime: true, orderIndex: true, status: true, updatedAt: true } }),
      prisma.educationalModule.count({ where }),
    ]);
    return apiResponse({ items, total, limit, offset });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const body = await readJson(request, moduleCreateSchema);
    const project = await prisma.researchProject.findUnique({ where: { id: body.researchProjectId } });
    if (!project) throw new ApiError(404, "Research project not found.", "PROJECT_NOT_FOUND");
    requireInstitutionRole(actor, project.institutionId, ["INSTITUTION_ADMIN", "RESEARCHER"]);
    if (project.createdById !== actor.id && !hasRole(actor, "SUPER_ADMIN") && !hasRole(actor, "INSTITUTION_ADMIN", project.institutionId)) {
      throw new ApiError(403, "Only the project owner or an institution administrator can add modules.", "CONTENT_EDIT_DENIED");
    }
    const duplicate = await prisma.educationalModule.findFirst({ where: { researchProjectId: project.id, slug: body.slug }, select: { id: true } });
    if (duplicate) throw new ApiError(409, "A module with this slug already exists for the project.", "MODULE_SLUG_CONFLICT");
    const created = await prisma.$transaction(async (tx) => {
      const newModule = await tx.educationalModule.create({ data: { ...body, status: "DRAFT", createdById: actor.id } });
      await tx.contentVersion.create({ data: { educationalModuleId: newModule.id, versionNumber: 1, contentSnapshot: toInputJson(body), changeDescription: "Initial draft", createdById: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: project.institutionId, action: "CREATE_EDUCATIONAL_MODULE", resourceType: "EducationalModule", resourceId: newModule.id } });
      return newModule;
    });
    return apiResponse(created, 201);
  } catch (error) {
    return apiError(error);
  }
}
