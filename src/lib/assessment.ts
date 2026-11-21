export type ScoredAnswer = { correct: boolean; points: number; category: string };

/** Scores guide learning only; they must never be used for eligibility decisions. */
export function calculateScore(answers: ScoredAnswer[]) {
  const pointsFor = (answer: ScoredAnswer) => Number.isFinite(answer.points) ? Math.max(0, answer.points) : 0;
  const maximumScore = answers.reduce((sum, answer) => sum + pointsFor(answer), 0);
  const totalScore = answers.reduce((sum, answer) => sum + (answer.correct ? pointsFor(answer) : 0), 0);
  const percentageScore = maximumScore === 0 ? 0 : Math.round((totalScore / maximumScore) * 100);
  const categories = new Map<string, { correctAnswers: number; totalQuestions: number }>();
  for (const answer of answers) {
    const result = categories.get(answer.category) ?? { correctAnswers: 0, totalQuestions: 0 };
    result.totalQuestions += 1;
    if (answer.correct) {
      result.correctAnswers += 1;
    }
    categories.set(answer.category, result);
  }
  return {
    totalScore,
    maximumScore,
    percentageScore,
    categories: [...categories.entries()].map(([category, result]) => ({
      category,
      correctAnswers: result.correctAnswers,
      totalQuestions: result.totalQuestions,
      percentageScore: result.totalQuestions ? Math.round(result.correctAnswers / result.totalQuestions * 100) : 0,
    })),
  };
}
