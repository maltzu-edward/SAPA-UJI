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
    if (!["DRAFT", "REVISION_REQUESTED", "REJECTED"].includes(project.reviewStatus)) {
      throw new ApiError(409, "Only a draft or returned project can be submitted for review.", "INVALID_WORKFLOW_STATE");
    }
    if (!project.sourceName?.trim() || !project.sourceVersion?.trim() || !project.sourceReference?.trim()) {
      throw new ApiError(400, "Add a source name, source version, and official reference before review.", "SOURCE_REFERENCE_REQUIRED");
    }
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.researchProject.update({ where: { id }, data: { reviewStatus: "SUBMITTED_FOR_REVIEW", visibility: "PRIVATE", publishedAt: null } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: project.institutionId, action: "SUBMIT_RESEARCH_PROJECT_FOR_REVIEW", resourceType: "ResearchProject", resourceId: id } });
      return saved;
    });
    return apiResponse(updated);
  } catch (error) {
    return apiError(error);
  }
}
