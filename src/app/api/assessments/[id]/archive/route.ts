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
    const assessment = await prisma.assessment.findUnique({ where: { id }, include: { project: true } });
    if (!assessment) throw new ApiError(404, "Assessment not found.", "ASSESSMENT_NOT_FOUND");
    requireInstitutionRole(actor, assessment.project.institutionId, ["INSTITUTION_ADMIN", "RESEARCHER"]);
    if (actor.id !== assessment.createdById && !hasRole(actor, "SUPER_ADMIN") && !hasRole(actor, "INSTITUTION_ADMIN", assessment.project.institutionId)) {
      throw new ApiError(403, "Only the assessment owner or an institution administrator can archive it.", "CONTENT_EDIT_DENIED");
    }
    if (assessment.status === "ARCHIVED") return apiResponse({ id, status: "ARCHIVED" });
    const archived = await prisma.$transaction(async (tx) => {
      const saved = await tx.assessment.update({ where: { id }, data: { status: "ARCHIVED" } });
      await tx.question.updateMany({ where: { assessmentId: id, status: { not: "ARCHIVED" } }, data: { status: "ARCHIVED" } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: assessment.project.institutionId, action: "ARCHIVE_ASSESSMENT", resourceType: "Assessment", resourceId: id } });
      return saved;
    });
    return apiResponse(archived);
  } catch (error) {
    return apiError(error);
  }
}
