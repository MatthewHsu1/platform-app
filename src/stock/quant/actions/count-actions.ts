import { applyInventory } from 'src/stock/quant/actions/apply-inventory';
import { readCountQuantViews } from 'src/stock/quant/actions/read-count-quant-views';
import { writeQuantCounts } from 'src/stock/quant/write-quant-counts';
import { filterReadableIds } from 'src/stock/stock-access';
import { readCurrentMemberId } from 'src/stock/stock-current-member';
import { StockUserError } from 'src/stock/stock-errors';
import { stockQuants } from 'src/stock/stock-records';
import { QUANT_ROW } from 'src/stock/stock-rows';
import { readIds } from 'src/stock/stock-route';
import { readStockSettings } from 'src/stock/stock-settings';
import {
  isOutdatedCount,
  planClearCounts,
  planConflictAnswer,
  planRequestCount,
  planSetCounts,
  planSetCountsToZero,
} from 'src/stock/utils/plan-count-actions.util';
import { type ConflictAnswer } from 'src/stock/utils/types/conflict-answer.type';
import { type QuantRow } from 'src/stock/types/quant-row.type';

export const NO_STOCK_ROW_SELECTED_MESSAGE = 'Select at least one stock row you can see.';

export const requireReadableQuantIds = async (body: Record<string, unknown>) => {
  const ids = readIds(body, 'quantIds');
  const readable = await filterReadableIds('stockQuant', 'stockQuants', ids);

  if (ids.length === 0 || readable.length !== ids.length) {
    throw new StockUserError(NO_STOCK_ROW_SELECTED_MESSAGE);
  }

  return readable;
};

export const readConflictAnswer = (value: unknown): ConflictAnswer | null =>
  value === 'keepCounted' || value === 'keepDifference' ? value : null;

export const readOptionalText = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export const readOptionalDateTime = (value: unknown) => {
  const text = readOptionalText(value);

  return text === null || Number.isNaN(Date.parse(text)) ? null : new Date(text).toISOString();
};

const readQuants = (quantIds: string[]) => stockQuants.find<QuantRow>({ id: { in: quantIds } }, QUANT_ROW);

export const setCounts = async (quantIds: string[], onlyUnset: boolean) => {
  const quants = await readQuants(quantIds);
  const memberId = await readCurrentMemberId();
  const plan = planSetCounts({ quants, memberId, onlyUnset });

  if (plan.kind === 'needsAnswer') {
    return {
      kind: 'needsAnswer',
      question: 'alreadySet',
      quants: await readCountQuantViews(quants.filter((quant) => plan.alreadySetIds.includes(quant.id))),
    };
  }
  // Planned again from each row as it is when written: a row counted meanwhile is left alone.
  const written = await writeQuantCounts(
    plan.updates.map((update) => update.id),
    (quant) => {
      const again = planSetCounts({ quants: [quant], memberId, onlyUnset: true });

      return again.kind === 'write' ? (again.updates[0]?.data ?? null) : null;
    },
  );

  return { kind: 'done', updated: written.length };
};

export const clearCounts = async (quantIds: string[]) => {
  const written = await writeQuantCounts(quantIds, (quant) => planClearCounts([quant.id])[0].data);

  return { kind: 'done', updated: written.length };
};

export const setCountsToZero = async (quantIds: string[]) => {
  const memberId = await readCurrentMemberId();
  const written = await writeQuantCounts(quantIds, (quant) => planSetCountsToZero({ quants: [quant], memberId })[0].data);

  return { kind: 'done', updated: written.length };
};

// The same date (and user) on every row.
export const requestCount = async (quantIds: string[], inventoryDate: string, assignedUserId: string | null) => {
  const [update] = planRequestCount({ quantIds, inventoryDate, assignedUserId });

  if (update !== undefined) {
    await stockQuants.updateMany(quantIds, update.data);
  }

  return { kind: 'done', updated: quantIds.length };
};

// Apply from a row applies what is selected; Apply counts applies only the
// ticked rows with a count. Outdated rows ask first; the answer
// is written on every row being applied, as the conflict pop-up does.
export const applyCounts = async ({
  quantIds,
  onlySet,
  inventoryName,
  accountingDate,
  conflictAnswer,
}: {
  quantIds: string[];
  onlySet: boolean;
  inventoryName: string | null;
  accountingDate: string | null;
  conflictAnswer: ConflictAnswer | null;
}) => {
  const digits = readStockSettings().productUnitDigits;
  const quants = await readQuants(quantIds);
  const targets = onlySet ? quants.filter((quant) => quant.inventoryQuantitySet) : quants;

  if (targets.length === 0) {
    return { kind: 'done', applied: 0 };
  }
  const countedQuantIds = targets.filter((quant) => quant.inventoryQuantitySet).map((quant) => quant.id);
  const outdated = targets.filter((quant) => isOutdatedCount(quant, digits));

  if (outdated.length > 0) {
    if (conflictAnswer === null) {
      return { kind: 'needsAnswer', question: 'conflict', quants: await readCountQuantViews(outdated) };
    }
    // A row whose count was applied or cleared by someone else meanwhile keeps what it holds.
    await writeQuantCounts(
      targets.map((quant) => quant.id),
      (quant) =>
        countedQuantIds.includes(quant.id) && !quant.inventoryQuantitySet
          ? null
          : planConflictAnswer({ quants: [quant], answer: conflictAnswer })[0].data,
    );
  }

  await applyInventory(
    targets.map((quant) => quant.id),
    { inventoryName, accountingDate, countedQuantIds },
  );

  return { kind: 'done', applied: targets.length };
};
