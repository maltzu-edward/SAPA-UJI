import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { issueSession, setSessionCookie, verifyPassword } from "@/lib/api/auth";
import { enforceRateLimit, requestAddress } from "@/lib/api/rate-limit";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) });

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const body = await readJson(request, loginSchema);
    const email = body.email.toLowerCase();
    const address = requestAddress(request);
    enforceRateLimit(`login:ip:${address}`, 20, 15 * 60 * 1000);
    enforceRateLimit(`login:email:${email}`, 8, 15 * 60 * 1000);
    const user = await prisma.user.findUnique({ where: { email }, include: { roles: true, memberships: { where: { membershipStatus: "ACTIVE" }, include: { institution: { select: { status: true } } } } } });
    if (!user?.isActive || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new ApiError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
    }
    const session = await issueSession(user.id);
    const response = apiResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map(({ role, institutionId }) => ({ role, institutionId })),
      institutionIds: user.memberships.filter((membership) => membership.institution.status === "ACTIVE").map((membership) => membership.institutionId),
    });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return apiError(error);
  }
}
