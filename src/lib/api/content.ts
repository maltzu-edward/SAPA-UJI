import { ApiError } from "@/lib/api/http";
import { hasRole, requireInstitutionRole, type ApiActor } from "@/lib/api/auth";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const contentEditorRoles = ["INSTITUTION_ADMIN", "RESEARCHER"] as const;

export function canEditProject(actor: ApiActor, project: { institutionId: string; createdById: string }) {
  return hasRole(actor, "SUPER_ADMIN")
    || hasRole(actor, "INSTITUTION_ADMIN", project.institutionId)
    || (project.createdById === actor.id && hasRole(actor, "RESEARCHER", project.institutionId));
}

export async function requireProjectEditor(actor: ApiActor, project: { id: string; institutionId: string; createdById: string }) {
  requireInstitutionRole(actor, project.institutionId, [...contentEditorRoles]);
  if (!canEditProject(actor, project)) throw new ApiError(403, "Only the content owner or an institution administrator can edit this item.", "CONTENT_EDIT_DENIED");
}

export async function findProject(id: string) {
  return prisma.researchProject.findUnique({ where: { id }, include: { stages: { orderBy: { stageOrder: "asc" } } } });
}

export async function writeAudit(tx: Prisma.TransactionClient, input: {
  actorId: string;
  institutionId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await tx.auditLog.create({ data: input });
}

export function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
