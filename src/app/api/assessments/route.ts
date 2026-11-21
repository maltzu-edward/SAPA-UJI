import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, queryNumber, readJson, requireSameOrigin } from "@/lib/api/http";
import { getOptionalActor, hasInstitutionAccess, hasRole, requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { assessmentCreateSchema } from "@/lib/api/schemas";
import { toInputJson } from "@/lib/api/content";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const actor = await getOptionalActor(request);
    const projectId = request.nextUrl.searchParams.get("researchProjectId") || undefined;
    const limit = queryNumber(request.nextUrl.searchParams.get("limit"), 20, 1, 50);
    const offset = queryNumber(request.nextUrl.searchParams.get("offset"), 0, 0, 10_000);
    let project;
    if (projectId) {
      project = await prisma.researchProject.findUnique({ where: { id: projectId }, select: { id: true, institutionId: true, visibility: true, reviewStatus: true } });
      if (!project) throw new ApiError(404, "Research project not found.", "PROJECT_NOT_FOUND");
    }
    const staffAccess = Boolean(actor && project && hasInstitutionAccess(actor, project.institutionId)
      && (hasRole(actor, "SUPER_ADMIN") || hasRole(actor, "INSTITUTION_ADMIN", project.institutionId) || hasRole(actor, "RESEARCHER", project.institutionId) || hasRole(actor, "CLINICAL_REVIEWER", project.institutionId)));
    if (project && !staffAccess && (project.visibility !== "PUBLIC" || project.reviewStatus !== "PUBLISHED")) throw new ApiError(404, "Research project not found.", "PROJECT_NOT_FOUND");
    const where = {
      ...(projectId ? { researchProjectId: projectId } : {}),
      ...(staffAccess ? {} : { status: "PUBLISHED" as const }),
      ...(!staffAccess && !projectId ? { project: { visibility: "PUBLIC" as const, reviewStatus: "PUBLISHED" as const } } : {}),
    };
    const [assessments, total] = await prisma.$transaction([
      prisma.assessment.findMany({ where, orderBy: { createdAt: "desc" }, skip: offset, take: limit, include: { questions: { where: { status: "PUBLISHED" }, orderBy: { orderIndex: "asc" }, include: { category: { select: { id: true, name: true, slug: true } }, options: { orderBy: { orderIndex: "asc" }, select: { id: true, optionText: true, feedback: true, orderIndex: true } } } } } }),
      prisma.assessment.count({ where }),
    ]);
    return apiResponse({ items: assessments.map(({ createdById: _createdById, ...assessment }) => assessment), total, limit, offset });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const body = await readJson(request, assessmentCreateSchema);
    const project = await prisma.researchProject.findUnique({ where: { id: body.researchProjectId } });
    if (!project) throw new ApiError(404, "Research project not found.", "PROJECT_NOT_FOUND");
    requireInstitutionRole(actor, project.institutionId, ["INSTITUTION_ADMIN", "RESEARCHER"]);
    if (project.createdById !== actor.id && !hasRole(actor, "SUPER_ADMIN") && !hasRole(actor, "INSTITUTION_ADMIN", project.institutionId)) {
      throw new ApiError(403, "Only the project owner or an institution administrator can create assessments.", "CONTENT_EDIT_DENIED");
    }
    const assessment = await prisma.$transaction(async (tx) => {
      const created = await tx.assessment.create({ data: { ...body, status: "DRAFT", createdById: actor.id } });
      await tx.contentVersion.create({ data: { assessmentId: created.id, versionNumber: 1, contentSnapshot: toInputJson(body), changeDescription: "Initial assessment draft", createdById: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: project.institutionId, action: "CREATE_ASSESSMENT", resourceType: "Assessment", resourceId: created.id } });
      return created;
    });
    const { createdById: _createdById, ...visible } = assessment;
    return apiResponse(visible, 201);
  } catch (error) {
    return apiError(error);
  }
}
