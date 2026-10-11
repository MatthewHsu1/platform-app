// The closed date on a save, from what the save wrote. Null = leave it.
export const planDateClosed = ({
  writtenProbability,
  markedLost,
  stageChanged,
  stageIsWon,
  beforeStageIsWon,
  now,
}: {
  writtenProbability: number | undefined;
  markedLost: boolean;
  stageChanged: boolean;
  stageIsWon: boolean;
  beforeStageIsWon: boolean;
  now: string;
}): { dateClosed: string | null } | null => {
  // A move between two won stages keeps the date of the first win.
  if (stageIsWon && beforeStageIsWon) {
    return null;
  }
  if ((writtenProbability ?? 0) >= 100 || markedLost) {
    return { dateClosed: now };
  }
  if ((writtenProbability ?? 0) > 0) {
    return { dateClosed: null };
  }
  if (stageChanged && !stageIsWon && writtenProbability === undefined) {
    return { dateClosed: null };
  }

  return null;
};
