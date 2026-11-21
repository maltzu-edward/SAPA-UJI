import { NextRequest } from "next/server";
import { apiError, apiResponse, queryNumber } from "@/lib/api/http";
import { requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await requireActor(request);
    const { id: institutionId } = await context.params;
    requireInstitutionRole(actor, institutionId, ["INSTITUTION_ADMIN"]);
    const limit = queryNumber(request.nextUrl.searchParams.get("limit"), 50, 1, 100);
    const offset = queryNumber(request.nextUrl.searchParams.get("offset"), 0, 0, 10_000);
    const [memberships, total] = await prisma.$transaction([
      prisma.institutionMembership.findMany({
        where: { institutionId },
        orderBy: { joinedAt: "desc" },
        skip: offset,
        take: limit,
        select: { id: true, membershipStatus: true, joinedAt: true, user: { select: { id: true, name: true, email: true, isActive: true, roles: { where: { institutionId }, select: { role: true } } } } },
      }),
      prisma.institutionMembership.count({ where: { institutionId } }),
    ]);
    return apiResponse({ items: memberships.map(({ user, ...membership }) => ({ ...membership, ...user, roles: user.roles.map(({ role }) => role) })), total, limit, offset });
  } catch (error) {
    return apiError(error);
  }
}
