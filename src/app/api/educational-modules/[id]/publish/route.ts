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
    const module = await prisma.educationalModule.findUnique({ where: { id }, include: { project: true } });
    if (!module) throw new ApiError(404, "Educational module not found.", "MODULE_NOT_FOUND");
    if (!module.project) throw new ApiError(409, "Global modules cannot be published through this route.", "GLOBAL_MODULE_READ_ONLY");
    requireInstitutionRole(actor, module.project.institutionId, ["INSTITUTION_ADMIN", "RESEARCHER"]);
    if (actor.id !== module.createdById && !hasRole(actor, "SUPER_ADMIN") && !hasRole(actor, "INSTITUTION_ADMIN", module.project.institutionId)) throw new ApiError(403, "Only the module owner or institution administrator can publish it.", "CONTENT_EDIT_DENIED");
    if (module.status !== "APPROVED") throw new ApiError(409, "A reviewer must approve the module before publication.", "REVIEW_REQUIRED");
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.educationalModule.update({ where: { id }, data: { status: "PUBLISHED" } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: module.project!.institutionId, action: "PUBLISH_EDUCATIONAL_MODULE", resourceType: "EducationalModule", resourceId: id } });
      return saved;
    });
    return apiResponse(updated);
  } catch (error) {
    return apiError(error);
  }
}
