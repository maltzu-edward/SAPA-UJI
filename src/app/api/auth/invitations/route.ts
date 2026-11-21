import { createHash, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

const inviteSchema = z.object({
  institutionId: z.string().uuid(),
  email: z.string().trim().email().max(254),
  role: z.enum(["INSTITUTION_ADMIN", "RESEARCHER", "CLINICAL_REVIEWER", "PARTICIPANT"]),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const institutionId = request.nextUrl.searchParams.get("institutionId");
    if (!institutionId || !z.string().uuid().safeParse(institutionId).success) throw new ApiError(400, "A valid institutionId query parameter is required.", "INVALID_QUERY");
    requireInstitutionRole(actor, institutionId, ["INSTITUTION_ADMIN"]);
    const items = await prisma.invitation.findMany({
      where: { institutionId },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, assignedRole: true, expiresAt: true, acceptedAt: true, createdAt: true },
    });
    return apiResponse({ items });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const body = await readJson(request, inviteSchema);
    requireInstitutionRole(actor, body.institutionId, ["INSTITUTION_ADMIN"]);
    const institution = await prisma.institution.findFirst({ where: { id: body.institutionId, status: "ACTIVE" }, select: { id: true } });
    if (!institution) throw new ApiError(404, "Institution not found or suspended.", "INSTITUTION_NOT_FOUND");

    const token = randomBytes(32).toString("base64url");
    const invitation = await prisma.$transaction(async (tx) => {
      const created = await tx.invitation.create({
        data: {
          email: body.email.toLowerCase(),
          institutionId: body.institutionId,
          invitedById: actor.id,
          assignedRole: body.role,
          tokenHash: createHash("sha256").update(token).digest("hex"),
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        },
        select: { id: true, email: true, institutionId: true, assignedRole: true, expiresAt: true, createdAt: true },
      });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: body.institutionId, action: "CREATE_INVITATION", resourceType: "Invitation", resourceId: created.id } });
      return created;
    });
    return apiResponse({ invitation, acceptanceToken: token, delivery: "NOT_SENT" }, 201);
  } catch (error) {
    return apiError(error);
  }
}
