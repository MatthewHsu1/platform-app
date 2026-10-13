import { MOVE_STATE, MOVE_TYPE } from 'src/stock/stock-options.constant';
import { relevantStateAmongMoves } from 'src/stock/utils/plan-picking-state.util';
import { compareAtDigits, isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type MoveType } from 'src/stock/types/move-type.type';
import { type MergeLinkedMove } from 'src/stock/utils/types/merge-linked-move.type';
import { type MergeMove } from 'src/stock/utils/types/merge-move.type';
import { type MergePlan } from 'src/stock/utils/types/merge-plan.type';

// Sales adds the never-attribute values to the key when it exists.
const MERGE_KEY_FIELDS = [
  'productId',
  'priceUnitMicros',
  'procureMethod',
  'locationId',
  'locationDestId',
  'locationFinalId',
  'productUomId',
  'restrictPartnerId',
  'originReturnedMoveId',
  'propagateCancel',
  'descriptionPicking',
  'dateDeadline',
] as const;

const NEGATIVE_KEY_FIELDS = MERGE_KEY_FIELDS.filter((field) => field !== 'descriptionPicking');

type MergeKeyField = (typeof MERGE_KEY_FIELDS)[number];

const keyOf = (move: MergeMove, fields: readonly MergeKeyField[]) =>
  JSON.stringify(fields.map((field) => move[field] ?? null));

const isLive = (state: MoveState) =>
  state !== MOVE_STATE.DONE && state !== MOVE_STATE.CANCEL && state !== MOVE_STATE.DRAFT;

const distinct = (values: string[]) => [...new Set(values)];

const extremeDate = (dates: (string | null)[], moveType: MoveType) => {
  const present = dates.flatMap((date) => (date === null ? [] : [date])).sort();

  if (present.length === 0) {
    return null;
  }

  return moveType === MOVE_TYPE.DIRECT ? present[0] : present[present.length - 1];
};

export const planMergeMoves = ({
  confirmedIds,
  candidates,
  moveTypeByPicking,
  linked,
  digits,
}: {
  confirmedIds: string[];
  candidates: MergeMove[];
  moveTypeByPicking: Map<string, MoveType>;
  linked: Map<string, MergeLinkedMove>;
  digits: number;
}): MergePlan => {
  const plan: MergePlan = { merges: [], absorbs: [], negativeUpdates: [], destroy: [], cancel: [], survivors: [] };
  const confirmed = new Set(confirmedIds);
  const working = new Map(candidates.map((move) => [move.id, { ...move }]));
  const negatives = candidates.filter((move) => confirmed.has(move.id) && move.productUomQty < 0);
  const negativeIds = new Set(negatives.map((move) => move.id));
  const pickingIds = distinct(
    candidates.flatMap((move) => (confirmed.has(move.id) && move.pickingId !== null ? [move.pickingId] : [])),
  );
  const positivesByNegativeKey = new Map<string, string[]>();
  const merged = new Set<string>();
  const toCancel = new Set<string>();

  for (const pickingId of pickingIds) {
    const moveType = moveTypeByPicking.get(pickingId) ?? MOVE_TYPE.DIRECT;
    const groups = new Map<string, MergeMove[]>();

    for (const move of candidates) {
      if (move.pickingId !== pickingId || !isLive(move.state) || negativeIds.has(move.id)) {
        continue;
      }
      const key = keyOf(move, MERGE_KEY_FIELDS);
      groups.set(key, [...(groups.get(key) ?? []), move]);
    }

    for (const group of groups.values()) {
      const [keep, ...absorbed] = group;

      if (absorbed.length > 0) {
        const productUomQty = group.reduce((sum, move) => sum + move.productUomQty, 0);
        const origin = distinct(group.flatMap((move) => (move.origin ? [move.origin] : []))).join('/');

        plan.merges.push({
          keepId: keep.id,
          absorbedIds: absorbed.map((move) => move.id),
          data: {
            productUomQty,
            date: extremeDate(group.map((move) => move.date), moveType),
            origin: origin === '' ? null : origin,
            state: relevantStateAmongMoves(
              group.map((move) => ({ state: move.state, productUomQty: move.productUomQty })),
              moveType,
            ),
          },
          addMoveOrigIds: distinct(absorbed.flatMap((move) => move.moveOrigIds)).filter((id) => !keep.moveOrigIds.includes(id)),
          addMoveDestIds: distinct(absorbed.flatMap((move) => move.moveDestIds)).filter((id) => !keep.moveDestIds.includes(id)),
        });
        plan.destroy.push(...absorbed.map((move) => move.id));
        merged.add(keep.id);
        const kept = working.get(keep.id);
        if (kept !== undefined) {
          kept.productUomQty = productUomQty;
        }
      }

      const negativeKey = keyOf(keep, NEGATIVE_KEY_FIELDS);
      positivesByNegativeKey.set(negativeKey, [...(positivesByNegativeKey.get(negativeKey) ?? []), keep.id]);
    }
  }

  const recordAbsorb = (positive: MergeMove, addMoveOrigIds: string[], addMoveDestIds: string[]) => {
    const existing = plan.absorbs.find((entry) => entry.positiveId === positive.id);
    const data = { productUomQty: positive.productUomQty, priceUnitMicros: positive.priceUnitMicros };

    if (existing === undefined) {
      plan.absorbs.push({ positiveId: positive.id, data, addMoveOrigIds, addMoveDestIds });
      return;
    }
    existing.data = data;
    existing.addMoveOrigIds = distinct([...existing.addMoveOrigIds, ...addMoveOrigIds]);
    existing.addMoveDestIds = distinct([...existing.addMoveDestIds, ...addMoveDestIds]);
  };

  for (const original of negatives) {
    const negative = working.get(original.id);

    if (negative === undefined) {
      continue;
    }

    for (const positiveId of positivesByNegativeKey.get(keyOf(negative, NEGATIVE_KEY_FIELDS)) ?? []) {
      const positive = working.get(positiveId);

      if (positive === undefined) {
        continue;
      }
      const totalValue =
        positive.productUomQty * positive.priceUnitMicros + negative.productUomQty * negative.priceUnitMicros;

      if (compareAtDigits(positive.productUomQty, Math.abs(negative.productUomQty), digits) >= 0) {
        positive.productUomQty += negative.productUomQty;
        positive.priceUnitMicros = positive.productUomQty === 0 ? 0 : Math.round(totalValue / positive.productUomQty);
        recordAbsorb(
          positive,
          original.moveOrigIds.filter((id) => linked.get(id)?.locationDestId === positive.locationId),
          original.moveDestIds.filter((id) => linked.get(id)?.locationId === positive.locationDestId),
        );
        merged.add(positive.id);
        plan.destroy.push(negative.id);
        if (isZeroAtDigits(positive.productUomQty, digits)) {
          toCancel.add(positive.id);
        }
        break;
      }

      negative.productUomQty += positive.productUomQty;
      negative.priceUnitMicros = Math.round(totalValue / negative.productUomQty);
      positive.productUomQty = 0;
      recordAbsorb(positive, [], []);
      toCancel.add(positive.id);
    }

    if (!plan.destroy.includes(negative.id) && negative.productUomQty !== original.productUomQty) {
      plan.negativeUpdates.push({
        negativeId: negative.id,
        productUomQty: negative.productUomQty,
        priceUnitMicros: negative.priceUnitMicros,
      });
    }
  }

  const destroyed = new Set(plan.destroy);
  plan.cancel = [...toCancel].filter((id) => !destroyed.has(id) && working.get(id)?.picked !== true);
  plan.survivors = distinct([...confirmedIds, ...merged]).filter((id) => !destroyed.has(id));

  return plan;
};
