import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { hasRole, requireActor } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

const createInstitutionSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  institutionType: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2_000).optional(),
  contactEmail: z.string().trim().email().max(254).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const where = hasRole(actor, "SUPER_ADMIN") ? {} : { id: { in: actor.institutionIds }, status: "ACTIVE" };
    const institutions = await prisma.institution.findMany({ where, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, institutionType: true, description: true, address: true, contactEmail: true, status: true } });
    return apiResponse({ items: institutions });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    if (!hasRole(actor, "SUPER_ADMIN")) throw new ApiError(403, "Only a super admin can create an institution.", "ROLE_ACCESS_DENIED");
    const body = await readJson(request, createInstitutionSchema);
    const institution = await prisma.$transaction(async (tx) => {
      const created = await tx.institution.create({ data: { ...body, status: "ACTIVE" } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: created.id, action: "CREATE_INSTITUTION", resourceType: "Institution", resourceId: created.id } });
      return created;
    });
    return apiResponse(institution, 201);
  } catch (error) {
    return apiError(error);
  }
}
