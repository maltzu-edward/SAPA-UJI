import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { hashPassword, issueSession, setSessionCookie } from "@/lib/api/auth";
import { enforceRateLimit, requestAddress } from "@/lib/api/rate-limit";
import { prisma } from "@/lib/prisma";

const acceptSchema = z.object({
  token: z.string().min(32).max(128),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
});

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    enforceRateLimit(`invite-accept:${requestAddress(request)}`, 10, 15 * 60 * 1000);
    const body = await readJson(request, acceptSchema);
    const email = body.email.toLowerCase();
    const tokenHash = createHash("sha256").update(body.token).digest("hex");
    const invitation = await prisma.invitation.findUnique({ where: { tokenHash } });
    if (!invitation || invitation.email.toLowerCase() !== email || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
      throw new ApiError(400, "The invitation is invalid, expired, or already used.", "INVITATION_INVALID");
    }
    const passwordHash = await hashPassword(body.password);
    const created = await prisma.$transaction(async (tx) => {
      const claimed = await tx.invitation.updateMany({ where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() } });
      if (claimed.count !== 1) throw new ApiError(400, "The invitation is invalid, expired, or already used.", "INVITATION_INVALID");
      if (await tx.user.findUnique({ where: { email }, select: { id: true } })) throw new ApiError(409, "That email address is already registered.", "EMAIL_ALREADY_EXISTS");
      const institution = await tx.institution.findFirst({ where: { id: invitation.institutionId, status: "ACTIVE" }, select: { id: true } });
      if (!institution) throw new ApiError(409, "This institution is not accepting invitations.", "INSTITUTION_INACTIVE");
      const user = await tx.user.create({ data: { name: body.name, email, passwordHash } });
      await tx.institutionMembership.create({ data: { userId: user.id, institutionId: invitation.institutionId, membershipStatus: "ACTIVE" } });
      await tx.userRole.create({ data: { userId: user.id, role: invitation.assignedRole, institutionId: invitation.institutionId } });
      await tx.auditLog.create({
        data: { actorId: user.id, institutionId: invitation.institutionId, action: "ACCEPT_INVITATION", resourceType: "Invitation", resourceId: invitation.id },
      });
      return user;
    });

    const session = await issueSession(created.id);
    const response = apiResponse({ id: created.id, name: created.name, email: created.email, institutionId: invitation.institutionId, role: invitation.assignedRole }, 201);
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return apiError(error);
  }
}
