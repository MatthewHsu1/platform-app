// The transfer's owner becomes the owner of every move and line it
// validates, so the stock lands on, and leaves, the owner's rows.
export const planOwnerOnTransferDone = ({
  pickingOwnerId,
  moves,
  lines,
}: {
  pickingOwnerId: string | null;
  moves: { id: string; restrictPartnerId: string | null }[];
  lines: { id: string; ownerId: string | null }[];
}) => {
  if (pickingOwnerId === null) {
    return { moveUpdates: [], lineUpdates: [] };
  }

  return {
    moveUpdates: moves
      .filter((move) => move.restrictPartnerId !== pickingOwnerId)
      .map((move) => ({ id: move.id, restrictPartnerId: pickingOwnerId })),
    lineUpdates: lines.filter((line) => line.ownerId !== pickingOwnerId).map((line) => ({ id: line.id, ownerId: pickingOwnerId })),
  };
};
