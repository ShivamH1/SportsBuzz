import type { Match, MatchStatus } from "../db/schema";
import { MATCH_STATUS } from "../validations/matches";

export function getMatchStatus(
  startTime: string | Date,
  endTime: string | Date | null,
  now = new Date(),
): MatchStatus | null {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : null;

  if (Number.isNaN(start.getTime()) || (end && Number.isNaN(end.getTime()))) {
    return null;
  }

  if (now < start) {
    return MATCH_STATUS.SCHEDULED as MatchStatus;
  }

  if (end && now >= end) {
    return MATCH_STATUS.FINISHED as MatchStatus;
  }

  return MATCH_STATUS.LIVE as MatchStatus;
}

export async function syncMatchStatus(
  match: Match,
  updateStatus: (status: MatchStatus) => Promise<any>,
): Promise<MatchStatus> {
  const nextStatus = getMatchStatus(match.startTime, match.endTime);
  if (!nextStatus) {
    return match.status as MatchStatus;
  }
  if (match.status !== nextStatus) {
    await updateStatus(nextStatus);
    // @ts-ignore - we are updating the local object copy
    match.status = nextStatus;
  }
  return match.status as MatchStatus;
}
