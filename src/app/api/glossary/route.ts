import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, queryNumber } from "@/lib/api/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams;
    const language = search.get("language");
    if (language && language !== "id" && language !== "en") throw new ApiError(400, "language must be 'id' or 'en'.", "INVALID_QUERY");
    const query = search.get("q")?.trim();
    const limit = queryNumber(search.get("limit"), 50, 1, 100);
    const offset = queryNumber(search.get("offset"), 0, 0, 10_000);
    const where = {
      reviewStatus: "PUBLISHED" as const,
      ...(language ? { language } : {}),
      ...(query ? { OR: [{ term: { contains: query, mode: "insensitive" as const } }, { simpleDefinition: { contains: query, mode: "insensitive" as const } }] } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.glossaryTerm.findMany({ where, orderBy: [{ language: "asc" }, { term: "asc" }], skip: offset, take: limit, select: { id: true, term: true, simpleDefinition: true, detailedDefinition: true, language: true, category: true, sourceReference: true } }),
      prisma.glossaryTerm.count({ where }),
    ]);
    return apiResponse({ items, total, limit, offset });
  } catch (error) {
    return apiError(error);
  }
}
