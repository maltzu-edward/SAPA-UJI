import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { getOptionalActor, hasInstitutionAccess, hasRole, requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { assessmentPatchSchema } from "@/lib/api/schemas";
import { toInputJson } from "@/lib/api/content";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const assessment = await prisma.assessment.findUnique({ where: { id }, include: { project: true, questions: { orderBy: { orderIndex: "asc" }, include: { category: true, options: { orderBy: { orderIndex: "asc" } }, rubric: true } } } });
    if (!assessment) throw new ApiError(404, "Assessment not found.", "ASSESSMENT_NOT_FOUND");
    const actor = await getOptionalActor(request);
    const staffAccess = Boolean(actor && hasInstitutionAccess(actor, assessment.project.institutionId)
      && (hasRole(actor, "SUPER_ADMIN") || hasRole(actor, "INSTITUTION_ADMIN", assessment.project.institutionId) || hasRole(actor, "RESEARCHER", assessment.project.institutionId) || hasRole(actor, "CLINICAL_REVIEWER", assessment.project.institutionId)));
    const isPublic = assessment.status === "PUBLISHED" && assessment.project.visibility === "PUBLIC" && assessment.project.reviewStatus === "PUBLISHED";
    if (!staffAccess && !isPublic) throw new ApiError(404, "Assessment not found.", "ASSESSMENT_NOT_FOUND");
    if (staffAccess) return apiResponse(assessment);
    const { project: _project, createdById: _createdById, ...publicAssessment } = assessment;
    return apiResponse({
      ...publicAssessment,
      questions: assessment.questions.filter((question) => question.status === "PUBLISHED").map((question) => ({
        ...question,
        rubric: undefined,
        options: question.options.map(({ id: optionId, optionText, feedback, orderIndex }) => ({ id: optionId, optionText, feedback, orderIndex })),
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const { id } = await context.params;
    const assessment = await prisma.assessment.findUnique({ where: { id }, include: { project: true } });
    if (!assessment) throw new ApiError(404, "Assessment not found.", "ASSESSMENT_NOT_FOUND");
    requireInstitutionRole(actor, assessment.project.institutionId, ["INSTITUTION_ADMIN", "RESEARCHER"]);
    if (actor.id !== assessment.createdById && !hasRole(actor, "SUPER_ADMIN") && !hasRole(actor, "INSTITUTION_ADMIN", assessment.project.institutionId)) {
      throw new ApiError(403, "Only the assessment owner or an institution administrator can edit it.", "CONTENT_EDIT_DENIED");
    }
    if (assessment.status === "SUBMITTED_FOR_REVIEW" || assessment.status === "ARCHIVED") throw new ApiError(409, "This assessment cannot be edited in its current workflow state.", "INVALID_WORKFLOW_STATE");
    const body = await readJson(request, assessmentPatchSchema);
    if (!Object.keys(body).length) throw new ApiError(400, "At least one assessment field is required.", "EMPTY_UPDATE");
    const version = (await prisma.contentVersion.aggregate({ where: { assessmentId: id }, _max: { versionNumber: true } }))._max.versionNumber ?? 0;
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.assessment.update({ where: { id }, data: { ...body, status: "DRAFT", version: { increment: 1 } } });
      await tx.contentVersion.create({ data: { assessmentId: id, versionNumber: version + 1, contentSnapshot: toInputJson(body), changeDescription: "Updated assessment draft; review is required again.", createdById: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: assessment.project.institutionId, action: "UPDATE_ASSESSMENT", resourceType: "Assessment", resourceId: id } });
      return saved;
    });
    const { createdById: _createdById, ...visible } = updated;
    return apiResponse(visible);
  } catch (error) {
    return apiError(error);
  }
}
