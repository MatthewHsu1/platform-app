import { nextNumber } from 'src/base/sequence/next-number';
import { readMoveLinks, readMoveReferences, readOriginPickingIds } from 'src/stock/move/move-links';
import { MOVE_TYPE, PICKING_STATE } from 'src/stock/stock-options.constant';
import { stockMoves, stockPickings, stockPickingTypes, stockReferenceMoveRels } from 'src/stock/stock-records';
import { MOVE_ROW, PICKING_ROW, PICKING_TYPE_ROW } from 'src/stock/stock-rows';
import { nowIso } from 'src/stock/stock-settings';
import { pickingAssignmentKey } from 'src/stock/utils/plan-confirm.util';
import { pickAssignmentCandidate, planPickingAssignment } from 'src/stock/utils/plan-picking-assignment.util';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type PickingRow } from 'src/stock/types/picking-row.type';
import { type PickingTypeRow } from 'src/stock/types/picking-type-row.type';
import { readWaveBatchIds } from 'src/stock-picking-batch/read-wave-batch-ids';

const OPEN_PICKING_STATES = [PICKING_STATE.DRAFT, PICKING_STATE.CONFIRMED, PICKING_STATE.WAITING, PICKING_STATE.ASSIGNED];

const distinct = (ids: string[]) => [...new Set(ids)];

const equalsOrNull = (value: string | null) => (value === null ? { is: 'NULL' } : { eq: value });

// Open transfers of the same references, locations and type that are not printed yet and not in a wave.
const findOpenPickings = async (referenceIds: string[], move: MoveRow, type: PickingTypeRow | undefined) => {
  const referencedMoveIds = (
    await stockReferenceMoveRels.find<{ moveId: string }>({ referenceId: { in: referenceIds } }, 'moveId')
  ).map((row) => row.moveId);
  const pickingIds = distinct(
    (await stockMoves.find<{ pickingId: string | null }>({ id: { in: referencedMoveIds } }, 'pickingId')).flatMap(
      (row) => (row.pickingId === null ? [] : [row.pickingId]),
    ),
  );

  if (pickingIds.length === 0) {
    return [];
  }

  const open = await stockPickings.find<PickingRow & { batchId: string | null }>(
    {
      id: { in: pickingIds },
      locationId: equalsOrNull(move.locationId),
      locationDestId: equalsOrNull(move.locationDestId ?? type?.defaultLocationDestId ?? null),
      pickingTypeId: { eq: move.pickingTypeId },
      printed: { eq: false },
      state: { in: OPEN_PICKING_STATES },
    },
    `${PICKING_ROW} batchId`,
  );
  // A transfer in a wave never takes new moves.
  const waveIds = await readWaveBatchIds(open.flatMap((picking) => (picking.batchId === null ? [] : [picking.batchId])));

  return open.filter((picking) => picking.batchId === null || !waveIds.has(picking.batchId));
};

export const assignMovesToPickings = async (moveIds: string[]) => {
  const moves = (await stockMoves.find<MoveRow>({ id: { in: distinct(moveIds) } }, MOVE_ROW)).filter(
    (move) => move.pickingId === null && move.pickingTypeId !== null,
  );

  if (moves.length === 0) {
    return [];
  }

  const ids = moves.map((move) => move.id);
  const links = await readMoveLinks(ids);
  const [references, originPickings, types] = await Promise.all([
    readMoveReferences(ids),
    readOriginPickingIds(ids, links),
    stockPickingTypes
      .find<PickingTypeRow>({ id: { in: distinct(moves.map((move) => move.pickingTypeId ?? '')) } }, PICKING_TYPE_ROW)
      .then((rows) => new Map(rows.map((row) => [row.id, row]))),
  ]);
  const groups = new Map<string, MoveRow[]>();

  for (const move of moves) {
    const key = pickingAssignmentKey({
      referenceIds: references.get(move.id) ?? [],
      locationId: move.locationId,
      locationDestId: move.locationDestId,
      pickingTypeId: move.pickingTypeId,
      moveOrigPickingIds: originPickings.get(move.id) ?? [],
    });
    groups.set(key, [...(groups.get(key) ?? []), move]);
  }

  const touched: string[] = [];

  for (const group of groups.values()) {
    const first = group[0];
    const type = types.get(first.pickingTypeId ?? '');
    const referenceIds = references.get(first.id) ?? [];
    const candidates = referenceIds.length === 0 ? [] : await findOpenPickings(referenceIds, first, type);
    const plan = planPickingAssignment({
      moves: group.map((move) => ({
        id: move.id,
        productUomQty: move.productUomQty,
        origin: move.origin,
        companyId: move.companyId,
        personId: move.personId,
        pickingTypeId: move.pickingTypeId ?? '',
        locationId: move.locationId,
        locationDestId: move.locationDestId,
      })),
      candidate: pickAssignmentCandidate(candidates),
    });

    if (plan.kind === 'skip') {
      continue;
    }

    let pickingId: string;

    if (plan.kind === 'reuse') {
      pickingId = plan.pickingId;
      await stockPickings.update(pickingId, plan.update);
    } else {
      // The app writes the transfer itself, so the transfer-create trigger
      // (which skips app writes) does not fill these.
      const name = type?.referenceSequenceId ? await nextNumber(type.referenceSequenceId) : '/';
      [pickingId] = await stockPickings.createMany([
        {
          ...plan.values,
          name,
          state: PICKING_STATE.DRAFT,
          moveType: type?.moveType ?? MOVE_TYPE.DIRECT,
          pickingTypeCode: type?.code ?? null,
          scheduledDate: nowIso(),
          responsibleUserId: null,
        },
      ]);
    }

    await stockMoves.updateMany(plan.moveIds, { pickingId });
    touched.push(pickingId);
  }

  return distinct(touched);
};
