import { NextRequest } from "next/server";
import { ApiError, apiError, apiResponse, readJson, requireSameOrigin } from "@/lib/api/http";
import { requireActor } from "@/lib/api/auth";
import { participantQuestionPatchSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const actor = await requireActor(request);
    const { id } = await context.params;
    const body = await readJson(request, participantQuestionPatchSchema);
    const existing = await prisma.participantQuestion.findUnique({ where: { id }, select: { id: true, participantId: true, researchProjectId: true } });
    if (!existing || existing.participantId !== actor.id) throw new ApiError(404, "Participant question not found.", "QUESTION_NOT_FOUND");
    const updated = await prisma.participantQuestion.update({ where: { id }, data: { isCompleted: body.isCompleted }, select: { id: true, researchProjectId: true, questionText: true, category: true, isCompleted: true, updatedAt: true } });
    return apiResponse(updated);
  } catch (error) {
    return apiError(error);
  }
}
