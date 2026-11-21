import { NextRequest } from "next/server";
import { apiError, apiResponse, queryNumber } from "@/lib/api/http";
import { requireActor } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const limit = queryNumber(request.nextUrl.searchParams.get("limit"), 50, 1, 100);
    const offset = queryNumber(request.nextUrl.searchParams.get("offset"), 0, 0, 10_000);
    const [items, total] = await prisma.$transaction([
      prisma.educationalFeedback.findMany({
        where: { participantId: actor.id },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        select: { id: true, assessmentAttemptId: true, feedbackText: true, createdAt: true, category: { select: { name: true, slug: true } }, recommendedModule: { select: { id: true, title: true, slug: true, language: true } } },
      }),
      prisma.educationalFeedback.count({ where: { participantId: actor.id } }),
    ]);
    return apiResponse({ items, total, limit, offset });
  } catch (error) {
    return apiError(error);
  }
}
