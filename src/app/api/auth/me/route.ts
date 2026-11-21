import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { requireActor } from "@/lib/api/auth";
import { userPreferencesSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const profile = await prisma.user.findUnique({ where: { id: actor.id }, select: { preferredLanguage: true, accessibilityPreferences: true } });
    if (!profile) throw new ApiError(404, "Account not found.", "ACCOUNT_NOT_FOUND");
    const institutions = actor.institutionIds.length
      ? await prisma.institution.findMany({ where: { id: { in: actor.institutionIds }, status: "ACTIVE" }, select: { id: true, name: true, slug: true, institutionType: true } })
      : [];
    return apiResponse({ ...actor, ...profile, institutions });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const body = await readJson(request, userPreferencesSchema);
    if (!Object.keys(body).length) throw new ApiError(400, "At least one profile preference is required.", "EMPTY_UPDATE");
    const current = await prisma.user.findUnique({ where: { id: actor.id }, select: { accessibilityPreferences: true } });
    if (!current) throw new ApiError(404, "Account not found.", "ACCOUNT_NOT_FOUND");
    const accessibilityPreferences = body.accessibilityPreferences
      ? { ...(current.accessibilityPreferences && typeof current.accessibilityPreferences === "object" && !Array.isArray(current.accessibilityPreferences) ? current.accessibilityPreferences : {}), ...body.accessibilityPreferences }
      : undefined;
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id: actor.id }, data: { ...(body.name ? { name: body.name } : {}), ...(body.preferredLanguage ? { preferredLanguage: body.preferredLanguage } : {}), ...(accessibilityPreferences ? { accessibilityPreferences } : {}) }, select: { id: true, name: true, email: true, preferredLanguage: true, accessibilityPreferences: true } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "UPDATE_ACCOUNT_PREFERENCES", resourceType: "User", resourceId: actor.id } });
      return user;
    });
    return apiResponse({ ...updated, roles: actor.roles, institutionIds: actor.institutionIds });
  } catch (error) {
    return apiError(error);
  }
}
