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
    const project = await prisma.researchProject.findUnique({ where: { id } });
    if (!project) throw new ApiError(404, "Research project not found.", "PROJECT_NOT_FOUND");
    requireInstitutionRole(actor, project.institutionId, ["CLINICAL_REVIEWER"]);
    if (project.createdById === actor.id) throw new ApiError(403, "Authors cannot review their own content.", "SELF_REVIEW_DENIED");
    if (project.reviewStatus !== "SUBMITTED_FOR_REVIEW") throw new ApiError(409, "Only submitted content can be reviewed.", "INVALID_WORKFLOW_STATE");

    const reviewedAt = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const saved = await tx.researchProject.update({ where: { id }, data: { reviewStatus: body.decision, visibility: "PRIVATE", publishedAt: null } });
      await tx.contentReview.create({
        data: { researchProjectId: id, reviewerId: actor.id, reviewType: "CLINICAL_REVIEW", status: body.decision, reviewerNotes: body.notes, reviewedAt },
      });
      await tx.auditLog.create({
        data: { actorId: actor.id, institutionId: project.institutionId, action: `REVIEW_RESEARCH_PROJECT_${body.decision}`, resourceType: "ResearchProject", resourceId: id },
      });
      return saved;
    });
    return apiResponse(result);
  } catch (error) {
    return apiError(error);
  }
}
