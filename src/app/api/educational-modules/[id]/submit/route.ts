import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, requireSameOrigin } from "@/lib/api/http";
import { hasRole, requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const { id } = await context.params;
    const educationalModule = await prisma.educationalModule.findUnique({ where: { id }, include: { project: true } });
    if (!educationalModule) throw new ApiError(404, "Educational module not found.", "MODULE_NOT_FOUND");
    if (!educationalModule.project) throw new ApiError(409, "Global modules cannot be submitted through this route.", "GLOBAL_MODULE_READ_ONLY");
    requireInstitutionRole(actor, educationalModule.project.institutionId, ["INSTITUTION_ADMIN", "RESEARCHER"]);
    if (actor.id !== educationalModule.createdById && !hasRole(actor, "SUPER_ADMIN") && !hasRole(actor, "INSTITUTION_ADMIN", educationalModule.project.institutionId)) throw new ApiError(403, "Only the module owner or institution administrator can submit it.", "CONTENT_EDIT_DENIED");
    if (!["DRAFT", "REVISION_REQUESTED", "REJECTED"].includes(educationalModule.status)) throw new ApiError(409, "Only a draft or returned module can be submitted.", "INVALID_WORKFLOW_STATE");
    if (!educationalModule.sourceReference?.trim()) throw new ApiError(400, "Add the approved source reference before review.", "SOURCE_REFERENCE_REQUIRED");
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.educationalModule.update({ where: { id }, data: { status: "SUBMITTED_FOR_REVIEW" } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: educationalModule.project!.institutionId, action: "SUBMIT_MODULE_FOR_REVIEW", resourceType: "EducationalModule", resourceId: id } });
      return saved;
    });
    return apiResponse(updated);
  } catch (error) {
    return apiError(error);
  }
}
