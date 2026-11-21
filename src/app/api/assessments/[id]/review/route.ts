import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { reviewSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const body = await readJson(request, reviewSchema);
    const { id } = await context.params;
    const assessment = await prisma.assessment.findUnique({ where: { id }, include: { project: true } });
    if (!assessment) throw new ApiError(404, "Assessment not found.", "ASSESSMENT_NOT_FOUND");
    requireInstitutionRole(actor, assessment.project.institutionId, ["CLINICAL_REVIEWER"]);
    if (assessment.createdById === actor.id) throw new ApiError(403, "Authors cannot review their own assessment.", "SELF_REVIEW_DENIED");
    if (assessment.status !== "SUBMITTED_FOR_REVIEW") throw new ApiError(409, "Only a submitted assessment can be reviewed.", "INVALID_WORKFLOW_STATE");
    const reviewedAt = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.assessment.update({ where: { id }, data: { status: body.decision } });
      await tx.question.updateMany({ where: { assessmentId: id, status: "SUBMITTED_FOR_REVIEW" }, data: { status: body.decision } });
      await tx.contentReview.create({ data: { assessmentId: id, reviewerId: actor.id, reviewType: "CLINICAL_REVIEW", status: body.decision, reviewerNotes: body.notes, reviewedAt } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: assessment.project.institutionId, action: `REVIEW_ASSESSMENT_${body.decision}`, resourceType: "Assessment", resourceId: id } });
      return saved;
    });
    return apiResponse(updated);
  } catch (error) {
    return apiError(error);
  }
}
