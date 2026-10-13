import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { recomputeAfterLineChanges } from 'src/stock/move-line/rules/recompute-after-line-changes';
import { type MoveLineEventRecord } from 'src/stock/move-line/types/move-line-event-record.type';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { stockMoveLines } from 'src/stock/stock-records';
import { MOVE_LINE_ROW } from 'src/stock/stock-rows';
import { nowIso, readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { planOpenLineEdit } from 'src/stock/utils/plan-open-line-edit.util';
import { convertQuantity } from 'src/stock/utils/stock-uom.util';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';

const OBJECT = { objectSingular: 'stockMoveLine', objectPlural: 'stockMoveLines' } as const;

// The done lines belong to done-line-edits.ts: the planner leaves them alone.
export const handleOpenLineEdits = async (
  events: ObjectRecordEvent<MoveLineEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }
  const staffEvents = events.filter((event) => eventBefore(event) !== undefined && !isApplicationWrite(eventAfter(event)));

  if (staffEvents.length === 0) {
    return;
  }

  const stored = new Map(
    (await stockMoveLines.find<MoveLineRow>({ id: { in: staffEvents.map((event) => event.recordId) } }, MOVE_LINE_ROW)).map(
      (line) => [line.id, line],
    ),
  );
  const productIds = [
    ...new Set(
      staffEvents.flatMap((event) => [eventBefore(event)?.productId, stored.get(event.recordId)?.productId]).flatMap(
        (id) => (id === undefined ? [] : [id]),
      ),
    ),
  ];
  const products = await readStockProducts(productIds);
  const uoms = await readResolvedUoms();
  const { productUnitDigits } = readStockSettings();
  const now = nowIso();
  const touchedKeys = new Set<string>();
  const touchedMoveIds = new Set<string>();
  const inProductUnit = (line: Pick<MoveLineRow, 'productId' | 'productUomId' | 'quantity'>) => {
    const product = products.get(line.productId);

    if (product === undefined || line.productUomId === null) {
      return line.quantity;
    }

    return convertQuantity({
      qty: line.quantity,
      fromUomId: line.productUomId,
      toUomId: product.uomId,
      uoms,
      digits: productUnitDigits,
      method: 'HALF-UP',
    });
  };

  for (const event of staffEvents) {
    const before = eventBefore(event);
    const current = stored.get(event.recordId);

    if (before === undefined || current === undefined) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      const plan = planOpenLineEdit({
        before: { ...before, quantityProductUom: inProductUnit(before) },
        after: { ...current, quantityProductUom: inProductUnit(current) },
        storedQuantityProductUom: current.quantityProductUom,
        isStorable: products.get(current.productId)?.isStorable ?? false,
        digits: productUnitDigits,
        now,
      });

      if (plan.kind === 'putBack') {
        await putBackForEvent({ ...OBJECT, event, data: plan.data, message: plan.reason });
        return;
      }
      if (plan.kind === 'sync') {
        await stockMoveLines.update(event.recordId, plan.data);
        plan.recomputeKeys.forEach((key) => touchedKeys.add(key));
        plan.recomputeMoveIds.forEach((id) => touchedMoveIds.add(id));
      }
    });
  }

  await errors.run('reservations', () =>
    recomputeAfterLineChanges({ keys: [...touchedKeys], moveIds: [...touchedMoveIds], productIds }),
  );
};
