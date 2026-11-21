import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { hasRole, requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string; membershipId: string }> };
const updateSchema = z.object({
  membershipStatus: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  role: z.enum(["INSTITUTION_ADMIN", "RESEARCHER", "CLINICAL_REVIEWER", "PARTICIPANT"]).optional(),
}).strict();

export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const body = await readJson(request, updateSchema);
    if (!Object.keys(body).length) throw new ApiError(400, "At least one membership field is required.", "EMPTY_UPDATE");
    const { id: institutionId, membershipId } = await context.params;
    requireInstitutionRole(actor, institutionId, ["INSTITUTION_ADMIN"]);
    const membership = await prisma.institutionMembership.findUnique({ where: { id: membershipId }, select: { id: true, userId: true, institutionId: true, membershipStatus: true } });
    if (!membership || membership.institutionId !== institutionId) throw new ApiError(404, "Institution member not found.", "MEMBER_NOT_FOUND");
    const result = await prisma.$transaction(async (tx) => {
      const currentAdminRole = await tx.userRole.findFirst({ where: { userId: membership.userId, institutionId, role: "INSTITUTION_ADMIN" }, select: { id: true } });
      const removesActiveAdmin = Boolean(currentAdminRole && membership.membershipStatus === "ACTIVE" && (body.membershipStatus === "SUSPENDED" || (body.role && body.role !== "INSTITUTION_ADMIN")));
      if (removesActiveAdmin && !hasRole(actor, "SUPER_ADMIN")) {
        const otherAdmins = await tx.userRole.findMany({ where: { institutionId, role: "INSTITUTION_ADMIN", userId: { not: membership.userId } }, select: { userId: true, user: { select: { isActive: true } } } });
        const otherAdminIds = [...new Set(otherAdmins.filter(({ user }) => user.isActive).map(({ userId }) => userId))];
        const activeAdminMemberships = otherAdminIds.length ? await tx.institutionMembership.count({ where: { institutionId, membershipStatus: "ACTIVE", userId: { in: otherAdminIds } } }) : 0;
        if (!activeAdminMemberships) throw new ApiError(409, "Assign another active institution administrator before suspending or changing the last administrator.", "LAST_INSTITUTION_ADMIN");
      }
      if (body.membershipStatus) await tx.institutionMembership.update({ where: { id: membership.id }, data: { membershipStatus: body.membershipStatus } });
      if (body.role) {
        await tx.userRole.deleteMany({ where: { userId: membership.userId, institutionId } });
        await tx.userRole.create({ data: { userId: membership.userId, institutionId, role: body.role } });
      }
      await tx.auditLog.create({
        data: { actorId: actor.id, institutionId, action: "UPDATE_INSTITUTION_MEMBER", resourceType: "InstitutionMembership", resourceId: membership.id, metadata: { ...(body.membershipStatus ? { membershipStatus: body.membershipStatus } : {}), ...(body.role ? { assignedRole: body.role } : {}) } },
      });
      return tx.institutionMembership.findUniqueOrThrow({
        where: { id: membership.id },
        select: { id: true, membershipStatus: true, joinedAt: true, user: { select: { id: true, name: true, email: true, isActive: true, roles: { where: { institutionId }, select: { role: true } } } } },
      });
    }, { isolationLevel: "Serializable" });
    return apiResponse({
      id: result.id,
      membershipStatus: result.membershipStatus,
      joinedAt: result.joinedAt,
      user: result.user,
    });
  } catch (error) {
    return apiError(error);
  }
}
