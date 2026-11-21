import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { hasRole, requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { questionPatchSchema } from "@/lib/api/schemas";
import { toInputJson } from "@/lib/api/content";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const body = await readJson(request, questionPatchSchema);
    const { id } = await context.params;
    const question = await prisma.question.findUnique({ where: { id }, include: { assessment: { include: { project: true } }, options: true, rubric: true } });
    if (!question) throw new ApiError(404, "Question not found.", "QUESTION_NOT_FOUND");
    const { assessment } = question;
    requireInstitutionRole(actor, assessment.project.institutionId, ["INSTITUTION_ADMIN", "RESEARCHER"]);
    if (actor.id !== assessment.createdById && !hasRole(actor, "SUPER_ADMIN") && !hasRole(actor, "INSTITUTION_ADMIN", assessment.project.institutionId)) throw new ApiError(403, "Only the assessment owner or an institution administrator can edit questions.", "CONTENT_EDIT_DENIED");
    if (assessment.status === "SUBMITTED_FOR_REVIEW" || assessment.status === "ARCHIVED" || question.status === "ARCHIVED") throw new ApiError(409, "This question cannot be edited in its current workflow state.", "INVALID_WORKFLOW_STATE");
    if (await prisma.assessmentResponse.count({ where: { questionId: id } })) throw new ApiError(409, "Questions with participant responses cannot be edited. Create a new question version instead.", "QUESTION_HAS_RESPONSES");
    const category = await prisma.assessmentCategory.findUnique({ where: { slug: body.categorySlug }, select: { id: true } });
    if (!category) throw new ApiError(400, "Assessment category not found.", "CATEGORY_NOT_FOUND");
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.question.update({
        where: { id },
        data: {
          categoryId: category.id,
          questionText: body.questionText,
          questionType: body.questionType,
          scenarioText: body.scenarioText ?? null,
          explanation: body.explanation,
          difficulty: body.difficulty,
          points: body.points,
          status: "DRAFT",
        },
      });
      await tx.questionOption.deleteMany({ where: { questionId: id } });
      for (const [index, option] of body.options.entries()) {
        await tx.questionOption.create({ data: { questionId: id, optionText: option.optionText, isCorrect: option.isCorrect, feedback: option.feedback, orderIndex: index + 1 } });
      }
      if (body.rubric) {
        await tx.teachBackRubric.upsert({
          where: { questionId: id },
          update: {
            rubricTitle: body.rubric.rubricTitle,
            rubricDescription: body.rubric.rubricDescription,
            evaluationCriteria: JSON.parse(JSON.stringify(body.rubric.evaluationCriteria)) as Prisma.InputJsonValue,
            reviewerGuidance: body.rubric.reviewerGuidance,
          },
          create: {
            questionId: id,
            rubricTitle: body.rubric.rubricTitle,
            rubricDescription: body.rubric.rubricDescription,
            evaluationCriteria: JSON.parse(JSON.stringify(body.rubric.evaluationCriteria)) as Prisma.InputJsonValue,
            reviewerGuidance: body.rubric.reviewerGuidance,
          },
        });
      } else if (question.rubric) {
        await tx.teachBackRubric.delete({ where: { questionId: id } });
      }
      await tx.assessment.update({ where: { id: assessment.id }, data: { status: "DRAFT", version: { increment: 1 } } });
      const version = (await tx.contentVersion.aggregate({ where: { assessmentId: assessment.id }, _max: { versionNumber: true } }))._max.versionNumber ?? 0;
      await tx.contentVersion.create({
        data: { assessmentId: assessment.id, versionNumber: version + 1, contentSnapshot: toInputJson(body), changeDescription: "Question revised; assessment review is required again.", createdById: actor.id },
      });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: assessment.project.institutionId, action: "UPDATE_ASSESSMENT_QUESTION", resourceType: "Question", resourceId: id } });
      return saved;
    });
    return apiResponse(updated);
  } catch (error) {
    return apiError(error);
  }
}
