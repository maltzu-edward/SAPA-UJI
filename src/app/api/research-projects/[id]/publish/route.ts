import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, requireSameOrigin } from "@/lib/api/http";
import { requireActor } from "@/lib/api/auth";
import { requireProjectEditor } from "@/lib/api/content";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const { id } = await context.params;
    const project = await prisma.researchProject.findUnique({ where: { id } });
    if (!project) throw new ApiError(404, "Research project not found.", "PROJECT_NOT_FOUND");
    await requireProjectEditor(actor, project);
    if (project.reviewStatus !== "APPROVED") throw new ApiError(409, "A reviewer must approve the project before publication.", "REVIEW_REQUIRED");
    const published = await prisma.$transaction(async (tx) => {
      const saved = await tx.researchProject.update({ where: { id }, data: { reviewStatus: "PUBLISHED", visibility: "PUBLIC", publishedAt: new Date(), archivedAt: null } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: project.institutionId, action: "PUBLISH_RESEARCH_PROJECT", resourceType: "ResearchProject", resourceId: id } });
      return saved;
    });
    return apiResponse(published);
  } catch (error) {
    return apiError(error);
  }
}
