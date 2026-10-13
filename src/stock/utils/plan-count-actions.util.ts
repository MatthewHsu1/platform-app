import { floatRound } from 'src/shared/utils/float-round.util';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type ConflictAnswer } from 'src/stock/utils/types/conflict-answer.type';
import { type CountQuant } from 'src/stock/utils/types/count-quant.type';
import { type QuantUpdate } from 'src/stock/utils/types/quant-update.type';

const CLEARED_COUNT = {
  inventoryQuantity: 0,
  inventoryDiffQuantity: 0,
  inventoryQuantitySet: false,
  isOutdated: false,
  assignedUserId: null,
};

// The stock a count was typed against is counted − difference; when the
// stock has moved since, the count is outdated.
export const isOutdatedCount = (quant: CountQuant, digits: number) =>
  quant.inventoryQuantitySet &&
  compareAtDigits((quant.inventoryQuantity ?? 0) - (quant.inventoryDiffQuantity ?? 0), quant.quantity, digits) !== 0;

export const planSetCounts = ({
  quants,
  memberId,
  onlyUnset,
}: {
  quants: CountQuant[];
  memberId: string | null;
  onlyUnset: boolean;
}): { kind: 'needsAnswer'; alreadySetIds: string[] } | { kind: 'write'; updates: QuantUpdate[] } => {
  const alreadySetIds = quants.filter((quant) => quant.inventoryQuantitySet).map((quant) => quant.id);

  if (!onlyUnset && alreadySetIds.length > 0) {
    return { kind: 'needsAnswer', alreadySetIds };
  }

  return {
    kind: 'write',
    updates: quants
      .filter((quant) => !quant.inventoryQuantitySet)
      .map((quant) => ({
        id: quant.id,
        data: {
          inventoryQuantity: quant.quantity,
          inventoryDiffQuantity: 0,
          inventoryQuantitySet: true,
          isOutdated: false,
          assignedUserId: memberId,
        },
      })),
  };
};

export const planClearCounts = (quantIds: string[]): QuantUpdate[] =>
  quantIds.map((id) => ({ id, data: { ...CLEARED_COUNT } }));

export const planSetCountsToZero = ({ quants, memberId }: { quants: CountQuant[]; memberId: string | null }): QuantUpdate[] =>
  quants.map((quant) => ({
    id: quant.id,
    data: {
      inventoryQuantity: 0,
      inventoryDiffQuantity: quant.quantity === 0 ? 0 : -quant.quantity,
      inventoryQuantitySet: true,
      isOutdated: false,
      assignedUserId: memberId,
    },
  }));

export const planConflictAnswer = ({ quants, answer }: { quants: CountQuant[]; answer: ConflictAnswer }): QuantUpdate[] =>
  quants.map((quant) =>
    answer === 'keepCounted'
      ? { id: quant.id, data: { inventoryDiffQuantity: (quant.inventoryQuantity ?? 0) - quant.quantity, isOutdated: false } }
      : { id: quant.id, data: { inventoryQuantity: quant.quantity + (quant.inventoryDiffQuantity ?? 0), isOutdated: false } },
  );

export const planRequestCount = ({
  quantIds,
  inventoryDate,
  assignedUserId,
}: {
  quantIds: string[];
  inventoryDate: string;
  assignedUserId: string | null;
}): QuantUpdate[] =>
  quantIds.map((id) => ({
    id,
    data: assignedUserId === null ? { inventoryDate } : { inventoryDate, assignedUserId },
  }));

// A row whose new count equals its stock makes no move.
export const planQuantityUpdates = <TRow extends { onHand: number; counted: number }>(rows: TRow[], digits: number) =>
  rows.filter((row) => compareAtDigits(floatRound(row.counted, 10 ** -digits, 'HALF-UP'), row.onHand, digits) !== 0);
