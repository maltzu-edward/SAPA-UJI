import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiResponse, queryNumber } from "@/lib/api/http";
import { hasInstitutionAccess, hasRole, requireActor } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const search = request.nextUrl.searchParams;
    const resourceType = search.get("resourceType");
    const resourceId = search.get("resourceId");
    if (!resourceType || !["RESEARCH_PROJECT", "EDUCATIONAL_MODULE", "ASSESSMENT"].includes(resourceType) || !resourceId || !z.string().uuid().safeParse(resourceId).success) {
      throw new ApiError(400, "Valid resourceType and resourceId query parameters are required.", "INVALID_QUERY");
    }
    const limit = queryNumber(search.get("limit"), 50, 1, 100);
    const offset = queryNumber(search.get("offset"), 0, 0, 10_000);
    let where: { researchProjectId?: string; educationalModuleId?: string; assessmentId?: string };
    let institutionId: string | null = null;
    if (resourceType === "RESEARCH_PROJECT") {
      const resource = await prisma.researchProject.findUnique({ where: { id: resourceId }, select: { id: true, institutionId: true } });
      if (!resource) throw new ApiError(404, "Content not found.", "CONTENT_NOT_FOUND");
      institutionId = resource.institutionId;
      where = { researchProjectId: resourceId };
    } else if (resourceType === "EDUCATIONAL_MODULE") {
      const resource = await prisma.educationalModule.findUnique({ where: { id: resourceId }, select: { id: true, project: { select: { institutionId: true } } } });
      if (!resource || !resource.project) throw new ApiError(404, "Content not found.", "CONTENT_NOT_FOUND");
      institutionId = resource.project.institutionId;
      where = { educationalModuleId: resourceId };
    } else {
      const resource = await prisma.assessment.findUnique({ where: { id: resourceId }, select: { id: true, project: { select: { institutionId: true } } } });
      if (!resource) throw new ApiError(404, "Content not found.", "CONTENT_NOT_FOUND");
      institutionId = resource.project.institutionId;
      where = { assessmentId: resourceId };
    }
    if (!institutionId || !hasInstitutionAccess(actor, institutionId)
      || !(hasRole(actor, "SUPER_ADMIN") || hasRole(actor, "INSTITUTION_ADMIN", institutionId) || hasRole(actor, "RESEARCHER", institutionId) || hasRole(actor, "CLINICAL_REVIEWER", institutionId))) {
      throw new ApiError(404, "Content history not found.", "CONTENT_NOT_FOUND");
    }
    const [items, total] = await prisma.$transaction([
      prisma.contentVersion.findMany({ where, orderBy: { versionNumber: "desc" }, skip: offset, take: limit, include: { creator: { select: { id: true, name: true } } } }),
      prisma.contentVersion.count({ where }),
    ]);
    return apiResponse({ items, total, limit, offset });
  } catch (error) {
    return apiError(error);
  }
}
