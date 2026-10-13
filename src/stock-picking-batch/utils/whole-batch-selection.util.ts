// Transfers count as one batch when the ones in a batch all sit in the same
// one and there are as many as that batch holds, less the ones leaving it.
// A transfer with no batch does not break this, as it is not counted apart.
export const isWholeBatchSelection = ({
  selected,
  memberCount,
  detachCount,
}: {
  selected: { batchId: string | null }[];
  memberCount: (batchId: string) => number;
  detachCount: number;
}) => {
  const batchIds = [...new Set(selected.flatMap((picking) => (picking.batchId === null ? [] : [picking.batchId])))];

  return batchIds.length === 1 && selected.length === memberCount(batchIds[0]) - detachCount;
};
