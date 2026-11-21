export type Role = "SUPER_ADMIN" | "INSTITUTION_ADMIN" | "RESEARCHER" | "CLINICAL_REVIEWER" | "PARTICIPANT";
export function canReviewContent(roles: Role[], creatorId: string, reviewerId: string) {
  return roles.includes("CLINICAL_REVIEWER") && creatorId !== reviewerId;
}
export function isInstitutionMember(actorInstitutionIds: string[], resourceInstitutionId: string) {
  return actorInstitutionIds.includes(resourceInstitutionId);
}
export function canViewAttempt(actorId: string, participantId: string, roles: Role[]) {
  return actorId === participantId || roles.includes("SUPER_ADMIN");
}
