import { readLocations } from 'src/stock/location/read-locations';
import { assignMoves } from 'src/stock/move/actions/assign-moves';
import { MOVE_STATE, PROCURE_METHOD, RESERVATION_METHOD } from 'src/stock/stock-options.constant';
import { stockMoves, stockPickingTypes, stockReferenceMoveRels } from 'src/stock/stock-records';
import { MOVE_ROW } from 'src/stock/stock-rows';
import { todayUtc } from 'src/stock/stock-settings';
import { planRetryWaitingMoves } from 'src/stock/utils/plan-retry-waiting-moves.util';
import { type MoveRow } from 'src/stock/types/move-row.type';

export const retryWaitingMoves = async (doneMoveIds: string[]) => {
  if (doneMoveIds.length === 0) {
    return;
  }
  const done = await stockMoves.find<MoveRow>({ id: { in: doneMoveIds } }, MOVE_ROW);
  const candidates = await stockMoves.find<MoveRow>(
    {
      state: { in: [MOVE_STATE.CONFIRMED, MOVE_STATE.PARTIALLY_AVAILABLE] },
      procureMethod: { eq: PROCURE_METHOD.MAKE_TO_STOCK },
      productId: { in: [...new Set(done.map((move) => move.productId))] },
    },
    MOVE_ROW,
  );

  if (candidates.length === 0) {
    return;
  }
  const locationIds = [
    ...new Set([
      ...done.flatMap((move) => (move.locationDestId === null ? [] : [move.locationDestId])),
      ...candidates.flatMap((move) => (move.locationId === null ? [] : [move.locationId])),
    ]),
  ];
  const typeIds = [...new Set(candidates.flatMap((move) => (move.pickingTypeId === null ? [] : [move.pickingTypeId])))];
  const [locations, types, references] = await Promise.all([
    readLocations(locationIds),
    typeIds.length === 0
      ? []
      : stockPickingTypes.find<{ id: string; reservationMethod: string }>({ id: { in: typeIds } }, 'id reservationMethod'),
    stockReferenceMoveRels.find<{ moveId: string; referenceId: string }>(
      { moveId: { in: [...doneMoveIds, ...candidates.map((move) => move.id)] } },
      'moveId referenceId',
    ),
  ]);
  const atConfirm = new Set(types.filter((type) => type.reservationMethod === RESERVATION_METHOD.AT_CONFIRM).map((type) => type.id));
  const referencesOf = (moveId: string) => references.filter((row) => row.moveId === moveId).map((row) => row.referenceId);

  const ordered = planRetryWaitingMoves({
    today: todayUtc(),
    doneMoves: done.flatMap((move) =>
      move.locationDestId === null
        ? []
        : [
            {
              productId: move.productId,
              locationDestId: move.locationDestId,
              locationDestParentPath: locations.get(move.locationDestId)?.parentPath ?? null,
              referenceIds: referencesOf(move.id),
            },
          ],
    ),
    candidates: candidates.map((move) => ({
      id: move.id,
      productId: move.productId,
      state: move.state,
      procureMethod: move.procureMethod,
      locationParentPath: move.locationId === null ? null : locations.get(move.locationId)?.parentPath ?? null,
      reservationDate: move.reservationDate,
      reservesAtConfirm: move.pickingTypeId !== null && atConfirm.has(move.pickingTypeId),
      priority: move.priority,
      date: move.date,
      referenceIds: referencesOf(move.id),
    })),
  });

  if (ordered.length > 0) {
    await assignMoves(ordered);
  }
};
