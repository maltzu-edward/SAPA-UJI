import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, requireSameOrigin } from "@/lib/api/http";
import { hasRole, requireActor, requireInstitutionRole } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const { id } = await context.params;
    const assessment = await prisma.assessment.findUnique({ where: { id }, include: { project: true, questions: { include: { options: true, rubric: true, category: { select: { slug: true } } } } } });
    if (!assessment) throw new ApiError(404, "Assessment not found.", "ASSESSMENT_NOT_FOUND");
    requireInstitutionRole(actor, assessment.project.institutionId, ["INSTITUTION_ADMIN", "RESEARCHER"]);
    if (actor.id !== assessment.createdById && !hasRole(actor, "SUPER_ADMIN") && !hasRole(actor, "INSTITUTION_ADMIN", assessment.project.institutionId)) throw new ApiError(403, "Only the assessment owner or an institution administrator can submit it.", "CONTENT_EDIT_DENIED");
    if (!["DRAFT", "REVISION_REQUESTED", "REJECTED"].includes(assessment.status)) throw new ApiError(409, "Only a draft or returned assessment can be submitted.", "INVALID_WORKFLOW_STATE");
    const questions = assessment.questions.filter((question) => question.status !== "ARCHIVED");
    if (!questions.length) throw new ApiError(400, "Add at least one question before submitting.", "ASSESSMENT_EMPTY");
    const requiredTopics = ["research-purpose", "research-procedure", "potential-benefits", "potential-risks", "participant-rights"];
    const includedTopics = new Set(questions.map((question) => question.category.slug));
    if (requiredTopics.some((topic) => !includedTopics.has(topic))) throw new ApiError(400, "Add at least one question for each of the five comprehension topics before review.", "ASSESSMENT_TOPICS_INCOMPLETE");
    for (const question of questions) {
      const valid = question.questionType === "TEACH_BACK"
        ? Boolean(question.rubric) && question.options.length === 0
        : question.options.length >= 2 && question.options.filter((option) => option.isCorrect).length === 1;
      if (!valid) throw new ApiError(400, "Every question must have valid choices or a human-review teach-back rubric.", "ASSESSMENT_INVALID");
    }
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.assessment.update({ where: { id }, data: { status: "SUBMITTED_FOR_REVIEW" } });
      await tx.question.updateMany({ where: { assessmentId: id, status: { not: "ARCHIVED" } }, data: { status: "SUBMITTED_FOR_REVIEW" } });
      await tx.auditLog.create({ data: { actorId: actor.id, institutionId: assessment.project.institutionId, action: "SUBMIT_ASSESSMENT_FOR_REVIEW", resourceType: "Assessment", resourceId: id } });
      return saved;
    });
    return apiResponse(updated);
  } catch (error) {
    return apiError(error);
  }
}
