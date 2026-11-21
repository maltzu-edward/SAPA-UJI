import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { hasRole, requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { questionCreateSchema } from "@/lib/api/schemas";
import { toInputJson } from "@/lib/api/content";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const body = await readJson(request, questionCreateSchema);
    const { id: assessmentId } = await context.params;
    const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, include: { project: true } });
    if (!assessment) throw new ApiError(404, "Assessment not found.", "ASSESSMENT_NOT_FOUND");
    requireInstitutionRole(actor, assessment.project.institutionId, ["INSTITUTION_ADMIN", "RESEARCHER"]);
    if (actor.id !== assessment.createdById && !hasRole(actor, "SUPER_ADMIN") && !hasRole(actor, "INSTITUTION_ADMIN", assessment.project.institutionId)) {
      throw new ApiError(403, "Only the assessment owner or an institution administrator can edit it.", "CONTENT_EDIT_DENIED");
    }
    if (!["DRAFT", "REVISION_REQUESTED", "REJECTED"].includes(assessment.status)) throw new ApiError(409, "Questions can only be added to a draft or returned assessment.", "INVALID_WORKFLOW_STATE");
    const category = await prisma.assessmentCategory.findUnique({ where: { slug: body.categorySlug }, select: { id: true } });
    if (!category) throw new ApiError(400, "Assessment category not found.", "CATEGORY_NOT_FOUND");
    const last = await prisma.question.findFirst({ where: { assessmentId }, orderBy: { orderIndex: "desc" }, select: { orderIndex: true } });
    const question = await prisma.$transaction(async (tx) => {
      const created = await tx.question.create({
        data: {
          assessmentId,
          categoryId: category.id,
          questionText: body.questionText,
          questionType: body.questionType,
          scenarioText: body.scenarioText ?? null,
          explanation: body.explanation,
          difficulty: body.difficulty,
          points: body.points,
          orderIndex: (last?.orderIndex ?? 0) + 1,
          status: "DRAFT",
        },
      });
      for (const [index, option] of body.options.entries()) {
        await tx.questionOption.create({ data: { questionId: created.id, optionText: option.optionText, isCorrect: option.isCorrect, feedback: option.feedback, orderIndex: index + 1 } });
      }
      if (body.rubric) {
        await tx.teachBackRubric.create({
          data: {
            questionId: created.id,
            rubricTitle: body.rubric.rubricTitle,
            rubricDescription: body.rubric.rubricDescription,
            evaluationCriteria: JSON.parse(JSON.stringify(body.rubric.evaluationCriteria)) as Prisma.InputJsonValue,
            reviewerGuidance: body.rubric.reviewerGuidance,
          },
        });
      }
      await tx.assessment.update({ where: { id: assessmentId }, data: { status: "DRAFT", version: { increment: 1 } } });
      await tx.contentVersion.create({ data: { assessmentId, versionNumber: assessment.version + 1, contentSnapshot: toInputJson(body), changeDescription: "Question added to assessment draft.", createdById: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: assessment.project.institutionId, action: "CREATE_ASSESSMENT_QUESTION", resourceType: "Question", resourceId: created.id } });
      return created;
    });
    return apiResponse(question, 201);
  } catch (error) {
    return apiError(error);
  }
}
