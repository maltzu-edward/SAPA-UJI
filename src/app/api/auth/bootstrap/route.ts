import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { hashPassword, issueSession, setSessionCookie } from "@/lib/api/auth";
import { enforceRateLimit, requestAddress } from "@/lib/api/rate-limit";
import { prisma } from "@/lib/prisma";

const bootstrapSchema = z.object({
  token: z.string().min(32).max(256),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
});

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    enforceRateLimit(`bootstrap:${requestAddress(request)}`, 5, 15 * 60 * 1000);
    const body = await readJson(request, bootstrapSchema);
    const expected = process.env.SAPA_UJI_BOOTSTRAP_TOKEN;
    if (!expected || expected.length < 32 || expected.includes("replace-with")) {
      throw new ApiError(503, "Initial administrator setup is not configured.", "BOOTSTRAP_DISABLED");
    }
    const given = Buffer.from(body.token);
    const configured = Buffer.from(expected);
    if (given.length !== configured.length || !timingSafeEqual(given, configured)) {
      throw new ApiError(403, "The bootstrap token is invalid.", "INVALID_BOOTSTRAP_TOKEN");
    }

    const email = body.email.toLowerCase();
    const user = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(741105241) IS NULL`;
      if (await tx.user.findUnique({ where: { email }, select: { id: true } })) {
        throw new ApiError(409, "That email address is already registered.", "EMAIL_ALREADY_EXISTS");
      }
      const superAdminCount = await tx.userRole.count({ where: { role: "SUPER_ADMIN", institutionId: null } });
      if (superAdminCount > 0) throw new ApiError(409, "Initial administrator setup has already been completed.", "BOOTSTRAP_ALREADY_USED");
      const created = await tx.user.create({ data: { name: body.name, email, passwordHash: await hashPassword(body.password) } });
      await tx.userRole.create({ data: { userId: created.id, role: "SUPER_ADMIN", institutionId: null } });
      await tx.auditLog.create({
        data: { actorId: created.id, action: "BOOTSTRAP_SUPER_ADMIN", resourceType: "User", resourceId: created.id, metadata: { email } },
      });
      return created;
    });
    const session = await issueSession(user.id);
    const response = apiResponse({ id: user.id, name: user.name, email: user.email, roles: ["SUPER_ADMIN"] }, 201);
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return apiError(error);
  }
}
