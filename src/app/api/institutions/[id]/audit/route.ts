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
    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where: { institutionId },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        select: { id: true, action: true, resourceType: true, resourceId: true, metadata: true, createdAt: true, actor: { select: { id: true, name: true, email: true } } },
      }),
      prisma.auditLog.count({ where: { institutionId } }),
    ]);
    return apiResponse({ items, total, limit, offset });
  } catch (error) {
    return apiError(error);
  }
}
