export type AssessmentBadgeTone = "apex" | "distinction" | "qualified" | "practice";

export type AssessmentReport = {
  badgeLabel: string;
  badgeTone: AssessmentBadgeTone;
  participantCount: number;
  rank: number | null;
  summary: string;
};

type AttemptLike = {
  scorePercent: number;
  submittedAt: string;
  userId: string;
};

function compareAttempts(left: AttemptLike, right: AttemptLike) {
  if (right.scorePercent !== left.scorePercent) {
    return right.scorePercent - left.scorePercent;
  }

  return new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime();
}

function buildBestAttemptMap(attempts: AttemptLike[]) {
  const bestByUser = new Map<string, AttemptLike>();

  for (const attempt of attempts) {
    const existing = bestByUser.get(attempt.userId);
    if (!existing || compareAttempts(attempt, existing) < 0) {
      bestByUser.set(attempt.userId, attempt);
    }
  }

  return bestByUser;
}

export function resolveAssessmentBadge(scorePercent: number, passed: boolean) {
  if (scorePercent >= 95) {
    return { label: "Apex Scholar", tone: "apex" as const };
  }

  if (scorePercent >= 85) {
    return { label: "Excellent Performer", tone: "distinction" as const };
  }

  if (passed) {
    return { label: "Qualified Performer", tone: "qualified" as const };
  }

  return { label: "Practice In Progress", tone: "practice" as const };
}

export function resolveAssessmentRank(attempts: AttemptLike[], userId: string) {
  const ranked = Array.from(buildBestAttemptMap(attempts).values()).sort(compareAttempts);
  const rankIndex = ranked.findIndex((attempt) => attempt.userId === userId);

  return {
    participantCount: ranked.length,
    rank: rankIndex === -1 ? null : rankIndex + 1,
  };
}

export function buildAssessmentReport(params: {
  attempts: AttemptLike[];
  passed: boolean;
  scorePercent: number;
  userId: string;
}): AssessmentReport {
  const badge = resolveAssessmentBadge(params.scorePercent, params.passed);
  const ranking = resolveAssessmentRank(params.attempts, params.userId);
  const rankLabel =
    ranking.rank && ranking.participantCount > 0
      ? `Current rank #${ranking.rank} of ${ranking.participantCount}.`
      : ranking.participantCount > 0
        ? `${ranking.participantCount} learners are on this board.`
        : "This is the first recorded score.";

  return {
    badgeLabel: badge.label,
    badgeTone: badge.tone,
    participantCount: ranking.participantCount,
    rank: ranking.rank,
    summary: `${rankLabel} Badge earned: ${badge.label}.`,
  };
}
