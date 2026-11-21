import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, apiError, apiResponse, queryNumber, readJson, requireSameOrigin } from "@/lib/api/http";
import { getOptionalActor, hasInstitutionAccess, hasRole, requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { projectCreateSchema } from "@/lib/api/schemas";
import { toInputJson } from "@/lib/api/content";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const actor = await getOptionalActor(request);
    const search = request.nextUrl.searchParams;
    const rawInstitutionId = search.get("institutionId");
    const institutionId = rawInstitutionId ? z.string().uuid().parse(rawInstitutionId) : undefined;
    const limit = queryNumber(search.get("limit"), 20, 1, 50);
    const offset = queryNumber(search.get("offset"), 0, 0, 10_000);
    const canManage = Boolean(actor && institutionId && hasInstitutionAccess(actor, institutionId)
      && (hasRole(actor, "SUPER_ADMIN") || hasRole(actor, "INSTITUTION_ADMIN", institutionId) || hasRole(actor, "RESEARCHER", institutionId) || hasRole(actor, "CLINICAL_REVIEWER", institutionId)));
    const where = canManage
      ? { institutionId }
      : { ...(institutionId ? { institutionId } : {}), visibility: "PUBLIC" as const, reviewStatus: "PUBLISHED" as const };
    const [items, total] = await prisma.$transaction([
      prisma.researchProject.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true, institutionId: true, title: true, slug: true, publicDescription: true,
          researchType: true, researchPhase: true, researchPurpose: true, researchStatus: true,
          interventionDescription: true, controlDescription: true, durationDescription: true,
          potentialBenefits: true, potentialRisks: true, participantRights: true,
          sourceName: true, sourceVersion: true, sourceReference: true,
          inclusionInformation: true, exclusionInformation: true, contactInformation: true,
          language: true, visibility: true, reviewStatus: true, publishedAt: true, updatedAt: true,
        },
      }),
      prisma.researchProject.count({ where }),
    ]);
    return apiResponse({ items, total, limit, offset });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const body = await readJson(request, projectCreateSchema);
    requireInstitutionRole(actor, body.institutionId, ["INSTITUTION_ADMIN", "RESEARCHER"]);
    const institution = await prisma.institution.findFirst({ where: { id: body.institutionId, status: "ACTIVE" }, select: { id: true } });
    if (!institution) throw new ApiError(404, "Institution not found or suspended.", "INSTITUTION_NOT_FOUND");

    const generatedSlug = body.title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "research-project";
    const slug = body.slug ?? generatedSlug;
    const duplicate = await prisma.researchProject.findFirst({ where: { institutionId: body.institutionId, slug }, select: { id: true } });
    if (duplicate) throw new ApiError(409, "A project with this slug already exists in the institution.", "PROJECT_SLUG_CONFLICT");
    const projectData = { ...body, slug, createdById: actor.id, visibility: "PRIVATE" as const, reviewStatus: "DRAFT" as const, publishedAt: null };
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.researchProject.create({ data: projectData });
      await tx.contentVersion.create({
        data: { researchProjectId: created.id, versionNumber: 1, contentSnapshot: toInputJson({ ...body, slug }), changeDescription: "Initial draft", createdById: actor.id },
      });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: created.institutionId, action: "CREATE_RESEARCH_PROJECT", resourceType: "ResearchProject", resourceId: created.id } });
      return created;
    });
    return apiResponse(project, 201);
  } catch (error) {
    return apiError(error);
  }
}
