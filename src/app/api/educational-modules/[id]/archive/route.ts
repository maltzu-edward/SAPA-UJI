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
    const educationalModule = await prisma.educationalModule.findUnique({ where: { id }, include: { project: true } });
    if (!educationalModule) throw new ApiError(404, "Educational module not found.", "MODULE_NOT_FOUND");
    if (!educationalModule.project) throw new ApiError(409, "Global modules cannot be archived through this route.", "GLOBAL_MODULE_READ_ONLY");
    requireInstitutionRole(actor, educationalModule.project.institutionId, ["INSTITUTION_ADMIN"]);
    if (educationalModule.status === "ARCHIVED") throw new ApiError(409, "Module is already archived.", "INVALID_WORKFLOW_STATE");
    const archived = await prisma.$transaction(async (tx) => {
      const saved = await tx.educationalModule.update({ where: { id }, data: { status: "ARCHIVED" } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: educationalModule.project!.institutionId, action: "ARCHIVE_EDUCATIONAL_MODULE", resourceType: "EducationalModule", resourceId: id } });
      return saved;
    });
    return apiResponse(archived);
  } catch (error) {
    return apiError(error);
  }
}
