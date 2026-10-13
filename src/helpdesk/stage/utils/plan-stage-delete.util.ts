// A stage stays while any case not in the trash points at it, archived cases too.
export const planStageDelete = ({
  deletedStageIds,
  cases,
}: {
  deletedStageIds: string[];
  cases: { id: string; stageId: string | null; active: boolean | null; deletedAt: string | null }[];
}) => {
  const used = new Set(cases.filter((row) => row.deletedAt === null).map((row) => row.stageId));

  return {
    restore: deletedStageIds.filter((id) => used.has(id)),
    allowed: deletedStageIds.filter((id) => !used.has(id)),
  };
};
