import { NextRequest } from "next/server";
import { apiError, apiResponse } from "@/lib/api/http";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const items = await prisma.assessmentCategory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, description: true } });
    return apiResponse({ items });
  } catch (error) {
    return apiError(error);
  }
}
