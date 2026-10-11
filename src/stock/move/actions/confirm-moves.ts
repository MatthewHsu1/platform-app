import { DEFAULT_CURRENCY_CODE } from 'src/shared/currency.constant';
import { readLocations } from 'src/stock/location/read-locations';
import { assignMoves } from 'src/stock/move/actions/assign-moves';
import { assignMovesToPickings } from 'src/stock/move/actions/assign-moves-to-pickings';
import { cancelMoves } from 'src/stock/move/actions/cancel-moves';
import { linkMoves, readMoveLinks, readMoveReferences, readOriginPickingIds, unlinkMoves } from 'src/stock/move/move-links';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { procurementsForConfirm } from 'src/stock/procurement/procurements-for-confirm';
import { readRuleProcureMethods } from 'src/stock/procurement/read-rule-procure-methods';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { MOVE_STATE, MOVE_TYPE, RESERVATION_METHOD } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoves, stockPickings, stockPickingTypes } from 'src/stock/stock-records';
import { MOVE_ROW, PICKING_TYPE_ROW } from 'src/stock/stock-rows';
import { readStockSettings, todayUtc } from 'src/stock/stock-settings';
import { bypassesReservation } from 'src/stock/utils/location-usage.util';
import { planConfirm } from 'src/stock/utils/plan-confirm.util';
import { planMergeMoves } from 'src/stock/utils/plan-merge-moves.util';
import { planNegativeMoves } from 'src/stock/utils/plan-negative-moves.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type MoveType } from 'src/stock/types/move-type.type';
import { type PickingTypeRow } from 'src/stock/types/picking-type-row.type';
import { type MergeLinkedMove } from 'src/stock/utils/types/merge-linked-move.type';
import { type MergePlan } from 'src/stock/utils/types/merge-plan.type';
import { type NegativeMovePlan } from 'src/stock/utils/types/negative-move-plan.type';

const RESERVE_NOW_STATES = [MOVE_STATE.CONFIRMED, MOVE_STATE.PARTIALLY_AVAILABLE];

const distinct = (ids: string[]) => [...new Set(ids)];

const readTypes = async (typeIds: string[]) => {
  const ids = distinct(typeIds.filter((id) => id !== ''));
  const rows = ids.length === 0 ? [] : await stockPickingTypes.find<PickingTypeRow>({ id: { in: ids } }, PICKING_TYPE_ROW);
  return new Map(rows.map((row) => [row.id, row]));
};

const moveOrder = (left: MoveRow, right: MoveRow) =>
  (left.sequence ?? 10) - (right.sequence ?? 10) || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);

const readLinked = async (ids: string[]) => {
  const rows =
    ids.length === 0
      ? []
      : await stockMoves.find<MergeLinkedMove & { productUomQty: number }>(
          { id: { in: distinct(ids) } },
          'id locationId locationDestId productUomQty',
        );
  return new Map(rows.map((row) => [row.id, row]));
};

type MovePair = { moveOrigId: string; moveDestId: string };

// Runs a step through the journal when there is one: the plan is stored once and
// a resumed run applies the same plan again, so the writes in `work` must be absolute.
type RunStep = <TPlan>(name: string, plan: () => Promise<TPlan>, work: (plan: TPlan) => Promise<void>) => Promise<TPlan>;

const plainStep: RunStep = async (_name, plan, work) => {
  const planned = await plan();
  await work(planned);
  return planned;
};

type MergeStep = { merge: MergePlan; detachIds: string[]; currencyById: Record<string, string> };

const mergeTouchedIds = ({ merge }: MergeStep) => [
  ...merge.merges.flatMap((entry) => [entry.keepId, ...entry.absorbedIds, ...entry.addMoveOrigIds, ...entry.addMoveDestIds]),
  ...merge.absorbs.flatMap((entry) => [entry.positiveId, ...entry.addMoveOrigIds, ...entry.addMoveDestIds]),
  ...merge.negativeUpdates.map((entry) => entry.negativeId),
  ...merge.destroy,
  ...merge.cancel,
];

const mergeConfirmedMoves = async (survivors: string[], digits: number, runStep: RunStep): Promise<MergeStep> =>
  runStep(
    'confirm:merge',
    async (): Promise<MergeStep> => {
      const confirmed = await stockMoves.find<MoveRow>({ id: { in: survivors } }, MOVE_ROW);
      const pickingIds = distinct(confirmed.flatMap((move) => (move.pickingId ? [move.pickingId] : [])));
      const empty: MergePlan = { merges: [], absorbs: [], negativeUpdates: [], destroy: [], cancel: [], survivors };

      if (pickingIds.length === 0) {
        return { merge: empty, detachIds: [], currencyById: {} };
      }

      const pickingMoves = await stockMoves.find<MoveRow>({ pickingId: { in: pickingIds } }, MOVE_ROW);
      const pickings = await stockPickings.find<{ id: string; moveType: MoveType }>({ id: { in: pickingIds } }, 'id moveType');
      const candidates = [...new Map([...pickingMoves, ...confirmed].map((move) => [move.id, move])).values()].sort(moveOrder);
      const links = await readMoveLinks(candidates.map((move) => move.id));
      const linked = await readLinked([...links.origsOf.values(), ...links.destsOf.values()].flat());

      return {
        merge: planMergeMoves({
          confirmedIds: survivors,
          candidates: candidates.map((move) => ({
            id: move.id,
            pickingId: move.pickingId,
            state: move.state,
            productId: move.productId,
            priceUnitMicros: move.priceUnit?.amountMicros ?? 0,
            procureMethod: move.procureMethod,
            locationId: move.locationId,
            locationDestId: move.locationDestId,
            locationFinalId: move.locationFinalId,
            productUomId: move.productUomId,
            restrictPartnerId: move.restrictPartnerId,
            originReturnedMoveId: move.originReturnedMoveId,
            propagateCancel: move.propagateCancel,
            descriptionPicking: move.descriptionPicking,
            dateDeadline: move.dateDeadline,
            productUomQty: move.productUomQty,
            date: move.date,
            origin: move.origin,
            moveOrigIds: links.origsOf.get(move.id) ?? [],
            moveDestIds: links.destsOf.get(move.id) ?? [],
            picked: move.picked,
          })),
          moveTypeByPicking: new Map(pickings.map((picking) => [picking.id, picking.moveType ?? MOVE_TYPE.DIRECT])),
          linked,
          digits,
        }),
        // Negative moves leave their transfer: they are absorbed or turned into a return.
        detachIds: confirmed.filter((move) => move.productUomQty < 0).map((move) => move.id),
        currencyById: Object.fromEntries(candidates.map((move) => [move.id, move.priceUnit?.currencyCode ?? DEFAULT_CURRENCY_CODE])),
      };
    },
    async ({ merge: plan, detachIds, currencyById }) => {
      const priceUnit = (id: string, amountMicros: number) => ({
        amountMicros,
        currencyCode: currencyById[id] ?? DEFAULT_CURRENCY_CODE,
      });

      await stockMoves.updateMany(detachIds, { pickingId: null });

      for (const merge of plan.merges) {
        const absorbedLines = await stockMoveLines.find<{ id: string }>({ moveId: { in: merge.absorbedIds } }, 'id');
        await stockMoveLines.updateMany(absorbedLines.map((line) => line.id), { moveId: merge.keepId });
        await stockMoves.update(merge.keepId, merge.data);
        await linkMoves([
          ...merge.addMoveOrigIds.map((moveOrigId) => ({ moveOrigId, moveDestId: merge.keepId })),
          ...merge.addMoveDestIds.map((moveDestId) => ({ moveOrigId: merge.keepId, moveDestId })),
        ]);
      }

      for (const absorb of plan.absorbs) {
        await stockMoves.update(absorb.positiveId, {
          productUomQty: absorb.data.productUomQty,
          priceUnit: priceUnit(absorb.positiveId, absorb.data.priceUnitMicros),
        });
        await linkMoves([
          ...absorb.addMoveOrigIds.map((moveOrigId) => ({ moveOrigId, moveDestId: absorb.positiveId })),
          ...absorb.addMoveDestIds.map((moveDestId) => ({ moveOrigId: absorb.positiveId, moveDestId })),
        ]);
      }

      for (const update of plan.negativeUpdates) {
        await stockMoves.update(update.negativeId, {
          productUomQty: update.productUomQty,
          priceUnit: priceUnit(update.negativeId, update.priceUnitMicros),
        });
      }

      // Not propagated: their destination moves now hang on the kept move.
      await stockMoves.updateMany(distinct([...plan.destroy, ...plan.cancel]), { propagateCancel: false });
      await cancelMoves(plan.destroy);
      await stockMoves.destroyMany(plan.destroy);
      await cancelMoves(plan.cancel);
    },
  );

type NegativeStep = { turns: { plan: NegativeMovePlan; unlink: MovePair[] }[] };

const negativeTouchedIds = ({ turns }: NegativeStep) =>
  turns.flatMap(({ plan, unlink }) => [
    plan.moveId,
    ...plan.moveOrigIds,
    ...plan.moveDestIds,
    ...unlink.flatMap((pair) => [pair.moveOrigId, pair.moveDestId]),
  ]);

const turnNegativeMovesAround = async (survivors: string[], runStep: RunStep): Promise<NegativeStep> =>
  runStep(
    'confirm:negatives',
    async (): Promise<NegativeStep> => {
      const negatives = (await stockMoves.find<MoveRow>({ id: { in: survivors } }, MOVE_ROW)).filter(
        (move) => move.productUomQty < 0,
      );

      if (negatives.length === 0) {
        return { turns: [] };
      }

      const links = await readMoveLinks(negatives.map((move) => move.id));
      const linked = await readLinked([...links.origsOf.values(), ...links.destsOf.values()].flat());
      const types = await readTypes(negatives.map((move) => move.pickingTypeId ?? ''));
      const plans = planNegativeMoves(
        negatives.map((move) => ({
          id: move.id,
          productUomQty: move.productUomQty,
          locationId: move.locationId,
          locationDestId: move.locationDestId,
          pickingTypeId: move.pickingTypeId,
          returnPickingTypeId: types.get(move.pickingTypeId ?? '')?.returnPickingTypeId ?? null,
          linked: distinct([...(links.origsOf.get(move.id) ?? []), ...(links.destsOf.get(move.id) ?? [])]).flatMap((id) => {
            const other = linked.get(id);
            return other === undefined ? [] : [other];
          }),
        })),
      );

      return {
        turns: plans.map((plan) => ({
          plan,
          unlink: [
            ...(links.origsOf.get(plan.moveId) ?? []).map((moveOrigId) => ({ moveOrigId, moveDestId: plan.moveId })),
            ...(links.destsOf.get(plan.moveId) ?? []).map((moveDestId) => ({ moveOrigId: plan.moveId, moveDestId })),
          ],
        })),
      };
    },
    async ({ turns }) => {
      for (const { plan, unlink } of turns) {
        await stockMoves.update(plan.moveId, plan.data);
        await unlinkMoves(unlink);
        await linkMoves([
          ...plan.moveOrigIds.map((moveOrigId) => ({ moveOrigId, moveDestId: plan.moveId })),
          ...plan.moveDestIds.map((moveDestId) => ({ moveOrigId: plan.moveId, moveDestId })),
        ]);
      }
    },
  );

// With a journal that was resumed, the run finishes what the stopped one began:
// the stored moves are taken in whatever state they are in, and every step
// below is safe to run twice.
export const confirmMoves = async (
  moveIds: string[],
  {
    merge,
    createProcurement,
    runId,
    onCommit,
    journal,
  }: { merge: boolean; createProcurement: boolean; runId?: string; onCommit?: () => Promise<void>; journal?: ClaimJournal },
) => {
  const { productUnitDigits: digits } = readStockSettings();
  const today = todayUtc();
  const resumed = journal?.resumed === true;
  const runStep: RunStep = journal === undefined ? plainStep : (name, plan, work) => journal.step(name, plan, work);
  const found = await stockMoves.find<MoveRow>({ id: { in: distinct(moveIds) } }, MOVE_ROW);
  const moves = found.filter((move) => (resumed ? move.state !== MOVE_STATE.CANCEL : move.state === MOVE_STATE.DRAFT));

  if (moves.length === 0) {
    await recomputeMove(found.map((move) => move.id));
    await recomputePickingState(distinct(found.flatMap((move) => (move.pickingId ? [move.pickingId] : []))));
    return [];
  }

  const ids = moves.map((move) => move.id);
  const links = await readMoveLinks(ids);
  const [references, originPickings, types, ruleProcureMethods] = await Promise.all([
    readMoveReferences(ids),
    readOriginPickingIds(ids, links),
    readTypes(moves.map((move) => move.pickingTypeId ?? '')),
    readRuleProcureMethods(ids),
  ]);

  const plan = planConfirm(
    moves.map((move) => ({
      id: move.id,
      state: move.state,
      procureMethod: move.procureMethod,
      moveOrigIds: links.origsOf.get(move.id) ?? [],
      ruleProcureMethod: ruleProcureMethods.get(move.id) ?? null,
      pickingId: move.pickingId,
      pickingTypeId: move.pickingTypeId,
      reservationMethod: types.get(move.pickingTypeId ?? '')?.reservationMethod ?? null,
      referenceIds: references.get(move.id) ?? [],
      locationId: move.locationId,
      locationDestId: move.locationDestId,
      moveOrigPickingIds: originPickings.get(move.id) ?? [],
    })),
    { createProcurement },
  );

  if (plan.procure.length > 0) {
    await procurementsForConfirm(plan.procure, { runId, onCommit, journal });
  }
  await onCommit?.();

  // A procurement may have cancelled some of them meanwhile.
  const alive = new Set(
    (await stockMoves.find<{ id: string }>({ id: { in: ids }, state: { neq: MOVE_STATE.CANCEL } }, 'id')).map((row) => row.id),
  );
  const isAlive = (id: string) => alive.has(id);

  await stockMoves.updateMany(plan.confirmed.filter(isAlive), { state: MOVE_STATE.CONFIRMED });
  await stockMoves.updateMany(plan.waiting.filter(isAlive), { state: MOVE_STATE.WAITING });
  await stockMoves.updateMany(plan.reserveToday.filter(isAlive), { reservationDate: today });

  const touchedPickings = new Set(moves.flatMap((move) => (move.pickingId ? [move.pickingId] : [])));
  // Moves already confirmed by the stopped run are no longer in the plan; the assignment skips those with a transfer.
  const groupedIds = resumed ? ids : plan.assignGroups.flatMap((group) => group.moveIds);
  for (const pickingId of await assignMovesToPickings(groupedIds.filter(isAlive))) {
    touchedPickings.add(pickingId);
  }

  let survivors = ids.filter(isAlive);
  const relinkedIds: string[] = [];
  if (merge) {
    const merged = await mergeConfirmedMoves(survivors, digits, runStep);
    survivors = merged.merge.survivors;
    relinkedIds.push(...mergeTouchedIds(merged));
  }
  const turned = await turnNegativeMovesAround(survivors, runStep);
  relinkedIds.push(...negativeTouchedIds(turned));
  for (const pickingId of await assignMovesToPickings(turned.turns.map(({ plan: turn }) => turn.moveId))) {
    touchedPickings.add(pickingId);
  }

  const current = await stockMoves.find<MoveRow>({ id: { in: survivors } }, MOVE_ROW);
  const productIds = distinct(current.map((move) => move.productId));
  const [products, sources, currentTypes] = await Promise.all([
    readStockProducts(productIds),
    readLocations(distinct(current.flatMap((move) => (move.locationId ? [move.locationId] : [])))),
    readTypes(current.map((move) => move.pickingTypeId ?? '')),
  ]);

  const reserveNow = current.filter((move) => {
    const source = sources.get(move.locationId ?? '');

    return (
      RESERVE_NOW_STATES.includes(move.state as (typeof RESERVE_NOW_STATES)[number]) &&
      ((source !== undefined && bypassesReservation(source.usage)) ||
        products.get(move.productId)?.isStorable !== true ||
        currentTypes.get(move.pickingTypeId ?? '')?.reservationMethod === RESERVATION_METHOD.AT_CONFIRM ||
        (move.reservationDate !== null && move.reservationDate <= today))
    );
  });

  if (reserveNow.length > 0) {
    await assignMoves(reserveNow.map((move) => move.id));
  }

  // Moves whose links changed (their chained moves included) get their derived values again.
  const changed = distinct([...survivors, ...relinkedIds]);
  const changedMoves = await stockMoves.find<{ id: string; pickingId: string | null }>({ id: { in: changed } }, 'id pickingId');
  for (const move of [...current, ...changedMoves]) {
    if (move.pickingId !== null) {
      touchedPickings.add(move.pickingId);
    }
  }

  await recomputeMove(changed);
  await recomputePickingState([...touchedPickings]);
  await recomputeProductQuantities(productIds);

  return survivors;
};
