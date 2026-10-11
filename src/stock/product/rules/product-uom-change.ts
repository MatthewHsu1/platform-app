import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type ProductTemplateEventRecord } from 'src/stock/product/types/product-template-event-record.type';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { productProducts, stockMoveLines, stockMoves, uomUoms } from 'src/stock/stock-records';
import { PRODUCT_UOM_CHANGE_REASON, planProductUomChange } from 'src/stock/utils/plan-product-stock-rules.util';

const OBJECT = { objectSingular: 'productTemplate', objectPlural: 'productTemplates' } as const;

// The moves and lines of the product take the new unit, unless one of them used another.
export const handleProductUomChange = async (
  events: ObjectRecordEvent<ProductTemplateEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }
  for (const event of events) {
    const before = eventBefore(event);
    const after = eventAfter(event);

    if (before === undefined || after === undefined || isApplicationWrite(after)) {
      continue;
    }
    if (before.uomId === null || after.uomId === null || before.uomId === after.uomId) {
      continue;
    }
    const oldUomId = before.uomId;
    const newUomId = after.uomId;

    await errors.run(event.recordId, async () => {
      const variants = await productProducts.find<{ id: string }>({ productTmplId: { eq: event.recordId } }, 'id');

      if (variants.length === 0) {
        return;
      }
      const variantIds = variants.map((variant) => variant.id);
      const moves = await stockMoves.find<{ id: string; productUomId: string | null }>(
        { productId: { in: variantIds } },
        'id productUomId',
      );
      const lines = await stockMoveLines.find<{ id: string; productUomId: string | null }>(
        { productId: { in: variantIds } },
        'id productUomId',
      );
      const plan = planProductUomChange({ oldUomId, newUomId, moves, lines });

      if (plan.kind === 'refuse') {
        const names = new Map(
          (await uomUoms.find<{ id: string; name: string | null }>({ id: { in: [plan.problemUomId, oldUomId] } }, 'id name')).map(
            (unit) => [unit.id, unit.name ?? ''],
          ),
        );

        await putBackForEvent({
          ...OBJECT,
          event,
          data: { uomId: oldUomId },
          message: PRODUCT_UOM_CHANGE_REASON,
          values: { problemUom: names.get(plan.problemUomId) ?? '', uom: names.get(oldUomId) ?? '' },
        });
        return;
      }
      await stockMoves.updateMany(plan.moveIds, { productUomId: newUomId });
      await stockMoveLines.updateMany(plan.lineIds, { productUomId: newUomId });
    });
  }
};
