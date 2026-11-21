import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, requireSameOrigin } from "@/lib/api/http";
import { requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const { id } = await context.params;
    const project = await prisma.researchProject.findUnique({ where: { id } });
    if (!project) throw new ApiError(404, "Research project not found.", "PROJECT_NOT_FOUND");
    requireInstitutionRole(actor, project.institutionId, ["INSTITUTION_ADMIN"]);
    if (project.reviewStatus === "ARCHIVED") throw new ApiError(409, "Project is already archived.", "INVALID_WORKFLOW_STATE");
    const archived = await prisma.$transaction(async (tx) => {
      const saved = await tx.researchProject.update({ where: { id }, data: { reviewStatus: "ARCHIVED", visibility: "PRIVATE", archivedAt: new Date(), publishedAt: null } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: project.institutionId, action: "ARCHIVE_RESEARCH_PROJECT", resourceType: "ResearchProject", resourceId: id } });
      return saved;
    });
    return apiResponse(archived);
  } catch (error) {
    return apiError(error);
  }
}
