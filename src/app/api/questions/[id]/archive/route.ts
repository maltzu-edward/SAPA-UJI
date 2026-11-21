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
    const question = await prisma.question.findUnique({ where: { id }, include: { assessment: { include: { project: true } } } });
    if (!question) throw new ApiError(404, "Question not found.", "QUESTION_NOT_FOUND");
    const assessment = question.assessment;
    requireInstitutionRole(actor, assessment.project.institutionId, ["INSTITUTION_ADMIN", "RESEARCHER"]);
    if (actor.id !== assessment.createdById && !hasRole(actor, "SUPER_ADMIN") && !hasRole(actor, "INSTITUTION_ADMIN", assessment.project.institutionId)) throw new ApiError(403, "Only the assessment owner or an institution administrator can archive questions.", "CONTENT_EDIT_DENIED");
    if (assessment.status === "SUBMITTED_FOR_REVIEW" || assessment.status === "ARCHIVED") throw new ApiError(409, "The assessment cannot be changed in its current workflow state.", "INVALID_WORKFLOW_STATE");
    if (question.status === "ARCHIVED") throw new ApiError(409, "Question is already archived.", "INVALID_WORKFLOW_STATE");
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.question.update({ where: { id }, data: { status: "ARCHIVED" } });
      await tx.assessment.update({ where: { id: assessment.id }, data: { status: "DRAFT", version: { increment: 1 } } });
      await tx.question.updateMany({ where: { assessmentId: assessment.id, id: { not: id }, status: { not: "ARCHIVED" } }, data: { status: "DRAFT" } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: assessment.project.institutionId, action: "ARCHIVE_ASSESSMENT_QUESTION", resourceType: "Question", resourceId: id } });
      return saved;
    });
    return apiResponse(updated);
  } catch (error) {
    return apiError(error);
  }
}
