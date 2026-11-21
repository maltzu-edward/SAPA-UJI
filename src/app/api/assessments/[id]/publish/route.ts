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
    const assessment = await prisma.assessment.findUnique({ where: { id }, include: { project: true, questions: { where: { status: { not: "ARCHIVED" } }, select: { id: true, status: true } } } });
    if (!assessment) throw new ApiError(404, "Assessment not found.", "ASSESSMENT_NOT_FOUND");
    requireInstitutionRole(actor, assessment.project.institutionId, ["INSTITUTION_ADMIN", "RESEARCHER"]);
    if (actor.id !== assessment.createdById && !hasRole(actor, "SUPER_ADMIN") && !hasRole(actor, "INSTITUTION_ADMIN", assessment.project.institutionId)) throw new ApiError(403, "Only the assessment owner or an institution administrator can publish it.", "CONTENT_EDIT_DENIED");
    if (assessment.status !== "APPROVED" || !assessment.questions.length || assessment.questions.some((question) => question.status !== "APPROVED")) {
      throw new ApiError(409, "A reviewer must approve the assessment and its questions before publication.", "REVIEW_REQUIRED");
    }
    const published = await prisma.$transaction(async (tx) => {
      const saved = await tx.assessment.update({ where: { id }, data: { status: "PUBLISHED" } });
      await tx.question.updateMany({ where: { assessmentId: id, status: "APPROVED" }, data: { status: "PUBLISHED" } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: assessment.project.institutionId, action: "PUBLISH_ASSESSMENT", resourceType: "Assessment", resourceId: id } });
      return saved;
    });
    return apiResponse(published);
  } catch (error) {
    return apiError(error);
  }
}
