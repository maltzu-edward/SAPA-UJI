import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { hasRole, requireActor } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Context = { params: Promise<{ id: string }> };
const updateSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  name: z.string().trim().min(2).max(160).optional(),
  institutionType: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(2_000).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  contactEmail: z.string().trim().email().max(254).nullable().optional(),
}).strict();

export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const { id } = await context.params;
    const body = await readJson(request, updateSchema);
    if (!Object.keys(body).length) throw new ApiError(400, "At least one institution field is required.", "EMPTY_UPDATE");
    if (body.status !== undefined) {
      if (!hasRole(actor, "SUPER_ADMIN")) throw new ApiError(403, "Only a super admin can change institution status.", "ROLE_ACCESS_DENIED");
    } else {
      requireInstitutionRole(actor, id, ["INSTITUTION_ADMIN"]);
    }
    const existing = await prisma.institution.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new ApiError(404, "Institution not found.", "INSTITUTION_NOT_FOUND");
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.institution.update({ where: { id }, data: body });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: id, action: body.status ? `SET_INSTITUTION_${body.status}` : "UPDATE_INSTITUTION_PROFILE", resourceType: "Institution", resourceId: id } });
      return saved;
    });
    return apiResponse(updated);
  } catch (error) {
    return apiError(error);
  }
}
