import type { WeeklyPattern, MasterWeeklyPattern } from '@det/backend-scheduling-domain';

export function isMasterPatternWithinBranchPattern(
  masterPattern: MasterWeeklyPattern,
  branchPattern: WeeklyPattern,
): boolean {
  for (const [dayOfWeek, masterDay] of masterPattern) {
    if (masterDay === null) {
      continue;
    }

    const branchDay = branchPattern.get(dayOfWeek);
    if (branchDay === undefined || branchDay === null) {
      return false;
    }

    const branchRanges = branchDay.toTimeRanges();
    const masterRanges = masterDay.toTimeRanges();

    const allMasterRangesInsideBranch = masterRanges.every((masterRange) =>
      branchRanges.some(
        (branchRange) =>
          branchRange.start.toMinutes() <= masterRange.start.toMinutes() &&
          branchRange.end.toMinutes() >= masterRange.end.toMinutes(),
      ),
    );

    if (!allMasterRangesInsideBranch) {
      return false;
    }
  }

  return true;
}
