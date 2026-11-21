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
    const module = await prisma.educationalModule.findUnique({ where: { id }, include: { project: true } });
    if (!module) throw new ApiError(404, "Educational module not found.", "MODULE_NOT_FOUND");
    if (!module.project) throw new ApiError(409, "Global modules cannot be reviewed through this route.", "GLOBAL_MODULE_READ_ONLY");
    requireInstitutionRole(actor, module.project.institutionId, ["CLINICAL_REVIEWER"]);
    if (module.createdById === actor.id) throw new ApiError(403, "Authors cannot review their own content.", "SELF_REVIEW_DENIED");
    if (module.status !== "SUBMITTED_FOR_REVIEW") throw new ApiError(409, "Only submitted content can be reviewed.", "INVALID_WORKFLOW_STATE");
    const reviewedAt = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.educationalModule.update({ where: { id }, data: { status: body.decision } });
      await tx.contentReview.create({ data: { educationalModuleId: id, reviewerId: actor.id, reviewType: "CLINICAL_REVIEW", status: body.decision, reviewerNotes: body.notes, reviewedAt } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: module.project!.institutionId, action: `REVIEW_EDUCATIONAL_MODULE_${body.decision}`, resourceType: "EducationalModule", resourceId: id } });
      return saved;
    });
    return apiResponse(updated);
  } catch (error) {
    return apiError(error);
  }
}
