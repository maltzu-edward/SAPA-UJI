import { describe, expect, it } from "vitest";
import { calculateScore } from "../src/lib/assessment";
import { canReviewContent, canViewAttempt, isInstitutionMember } from "../src/lib/permissions";

describe("learning score", () => {
  it("calculates total and topic results without assigning a pass threshold", () => {
    expect(calculateScore([{ correct: true, points: 2, category: "RIGHTS" }, { correct: false, points: 1, category: "RIGHTS" }, { correct: true, points: 1, category: "PURPOSE" }])).toEqual({
      totalScore: 3, maximumScore: 4, percentageScore: 75,
      categories: [{ category: "RIGHTS", correctAnswers: 1, totalQuestions: 2, percentageScore: 50 }, { category: "PURPOSE", correctAnswers: 1, totalQuestions: 1, percentageScore: 100 }],
    });
  });
  it("handles an empty assessment", () => expect(calculateScore([]).percentageScore).toBe(0));
});

describe("authorization helpers", () => {
  it("enforces reviewer role and separation of duties", () => {
    expect(canReviewContent(["CLINICAL_REVIEWER"], "researcher", "reviewer")).toBe(true);
    expect(canReviewContent(["CLINICAL_REVIEWER"], "same", "same")).toBe(false);
    expect(canReviewContent(["RESEARCHER"], "researcher", "reviewer")).toBe(false);
  });
  it("isolates institution and participant records", () => {
    expect(isInstitutionMember(["a"], "a")).toBe(true);
    expect(isInstitutionMember(["a"], "b")).toBe(false);
    expect(canViewAttempt("participant", "participant", [])).toBe(true);
    expect(canViewAttempt("other", "participant", [])).toBe(false);
    expect(canViewAttempt("admin", "participant", ["SUPER_ADMIN"])).toBe(true);
  });
});
