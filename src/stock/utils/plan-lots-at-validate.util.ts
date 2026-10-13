import { PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { planActionDone } from 'src/stock/utils/plan-action-done.util';
import { planPreDonePicked } from 'src/stock/utils/plan-validate-checks.util';
import { type DoneLineCandidate } from 'src/stock/utils/types/done-line-candidate.type';
import { type LotToCreate } from 'src/stock/utils/types/lot-to-create.type';
import { type LotsAtValidatePlan } from 'src/stock/utils/types/lots-at-validate-plan.type';
import { type SanityLotLine } from 'src/stock/utils/types/sanity-lot-line.type';
import { type TrackingRefusal } from 'src/stock/utils/types/tracking-refusal.type';
import { type ValidateLotLine } from 'src/stock/utils/types/validate-lot-line.type';
import { type ValidateMove } from 'src/stock/utils/types/validate-move.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

export const LOT_MISSING_MESSAGE = 'You need to supply a Lot/Serial number for products {products}.';
export const LOT_MISSING_TRANSFERS_MESSAGE = 'Transfers {transfers}: You need to supply a Lot/Serial number for products {products}.';
export const LOT_MISSING_AT_DONE_MESSAGE = 'You need to supply a Lot/Serial Number for product:\n{products}';

export const lotKey = (productId: string, name: string) => `${productId}|${name}`;

const distinct = (values: string[]) => [...new Set(values)];

// The lines Validate will commit, worked out by its own planners: the moves it marks picked when a transfer has a
// quantity and nothing picked, then the lines its done step keeps (picked lines of picked moves with a quantity).
export const selectLinesToBeDone = <TLine extends DoneLineCandidate>({
  lines,
  moves,
  uoms,
  digits,
}: {
  lines: TLine[];
  moves: ValidateMove[];
  uoms: Map<string, ResolvedUom>;
  digits: number;
}): TLine[] => {
  const marked = new Set(
    [...new Set(moves.map((move) => move.pickingId))].flatMap((pickingId) =>
      planPreDonePicked({
        id: pickingId ?? '',
        name: '',
        lineCount: 0,
        moves: moves
          .filter((move) => move.pickingId === pickingId)
          .map((move) => ({ ...move, isScrap: move.toInventory, productName: '', uomName: '', lines: [] })),
      }),
    ),
  );
  const { commitLineIds } = planActionDone({
    moves: moves.map((move) => ({
      id: move.id,
      state: move.state,
      picked: move.picked || marked.has(move.id),
      productUomQty: move.productUomQty,
      isInventory: move.isInventory,
      productUomId: move.productUomId,
      lines: lines
        .filter((line) => line.moveId === move.id)
        .map((line) => ({
          id: line.id,
          quantity: line.quantity,
          productUomId: line.productUomId,
          picked: line.picked || marked.has(move.id),
        })),
    })),
    cancelBackorder: false,
    uoms,
    digits,
  });
  const commit = new Set(commitLineIds);

  return lines.filter((line) => commit.has(line.id));
};

// The first check of Validate: picked lines with a quantity, in transfers whose type makes or picks lots, need
// a lot or a name.
export const planSanityLotsMissing = (lines: SanityLotLine[], severalTransfers: boolean): TrackingRefusal | null => {
  const missing = lines.filter(
    (line) =>
      line.pickingUsesLots &&
      line.tracking !== PRODUCT_TRACKING.NONE &&
      line.picked &&
      line.quantity !== 0 &&
      line.lotId === null &&
      !line.lotName,
  );

  if (missing.length === 0) {
    return null;
  }
  const products = distinct(missing.map((line) => line.productName)).join(', ');

  return severalTransfers
    ? {
        message: LOT_MISSING_TRANSFERS_MESSAGE,
        values: { transfers: distinct(missing.map((line) => line.pickingName)).join(', '), products },
      }
    : { message: LOT_MISSING_MESSAGE, values: { products } };
};

export const lotMissingAtDoneRefusal = (productNames: string[]): TrackingRefusal => ({
  message: LOT_MISSING_AT_DONE_MESSAGE,
  values: { products: productNames.map((name) => `- ${name}`).join('\n') },
});

// What the lines to be done need for their lots: a line with a quantity of a tracked product needs a lot unless
// it is on a count or a scrap, or its type neither makes nor picks lots. A type that makes lots finds the lot by
// its typed name or makes it (one per name for lots, one per line for serials).
export const planLotsAtValidate = (lines: ValidateLotLine[], existingLotIdByKey: Map<string, string>): LotsAtValidatePlan => {
  const missing: ValidateLotLine[] = [];
  const assign: LotsAtValidatePlan['assign'] = [];
  const create: LotToCreate[] = [];
  const createdByKey = new Map<string, LotToCreate>();

  for (const line of lines) {
    if (line.quantity <= 0 || line.tracking === PRODUCT_TRACKING.NONE) {
      continue;
    }
    if (!(line.hasPickingType || line.isInventory || line.lotId !== null || line.isScrap)) {
      missing.push(line);
      continue;
    }
    if (!line.hasPickingType || line.lotId !== null || (!line.useCreateLots && !line.useExistingLots)) {
      continue;
    }
    if (!line.useCreateLots) {
      missing.push(line);
      continue;
    }
    const existingId = line.lotName ? existingLotIdByKey.get(lotKey(line.productId, line.lotName)) : undefined;

    if (existingId !== undefined) {
      assign.push({ lineId: line.id, lotId: existingId });
      continue;
    }
    if (!line.lotName) {
      missing.push(line);
      continue;
    }
    const key = lotKey(line.productId, line.lotName);
    const shared = line.tracking === PRODUCT_TRACKING.LOT ? createdByKey.get(key) : undefined;

    if (shared !== undefined) {
      shared.lineIds.push(line.id);
      continue;
    }
    const lot: LotToCreate = {
      productId: line.productId,
      name: line.lotName,
      expirationDate: line.expirationDate,
      lineIds: [line.id],
    };

    create.push(lot);
    createdByKey.set(key, lot);
  }

  return {
    missingProductNames: distinct(missing.map((line) => line.productName)),
    missingLineIds: missing.map((line) => line.id),
    assign,
    create,
  };
};
