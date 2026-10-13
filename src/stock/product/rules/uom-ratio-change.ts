import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type UomEventRecord } from 'src/stock/product/types/uom-event-record.type';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';
import { MOVE_STATE, OPEN_LINE_STATES } from 'src/stock/stock-options.constant';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { productProducts, productTemplates, stockMoveLines, stockMoves, stockQuants } from 'src/stock/stock-records';
import { UOM_RATIO_CHANGE_REASON, planUomRatioChange } from 'src/stock/utils/plan-product-stock-rules.util';

const OPEN_MOVE_STATES = [MOVE_STATE.DRAFT, ...OPEN_LINE_STATES];

const usesOf = async (uomId: string) => {
  const openFilter = { productUomId: { eq: uomId }, state: { in: OPEN_MOVE_STATES } };
  const moves = await stockMoves.find<{ id: string }>(openFilter, 'id');
  const lines = await stockMoveLines.find<{ id: string }>(openFilter, 'id');
  const templates = await productTemplates.find<{ id: string }>({ uomId: { eq: uomId } }, 'id');
  const variants =
    templates.length === 0
      ? []
      : await productProducts.find<{ id: string }>({ productTmplId: { in: templates.map((template) => template.id) } }, 'id');
  const held =
    variants.length === 0
      ? []
      : await stockQuants.find<{ id: string }>(
          { productId: { in: variants.map((variant) => variant.id) }, quantity: { neq: 0 } },
          'id',
        );

  return {
    openMoves: moves.length,
    openLines: lines.length,
    heldQuants: held.length,
  };
};

// The Products unit trigger rebuilds `factor` from `relativeFactor` after any change, so it
// also rebuilds it after this put-back; the two triggers need no order.
export const handleUomRatioChange = async (
  events: ObjectRecordEvent<UomEventRecord>[],
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
    if (before.relativeFactor === after.relativeFactor && before.relativeUomId === after.relativeUomId) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      const data = planUomRatioChange({ before, after, ...(await usesOf(event.recordId)) });

      if (data !== null) {
        await putBackForEvent({
          objectSingular: 'uomUom',
          objectPlural: 'uomUoms',
          event,
          data,
          message: UOM_RATIO_CHANGE_REASON,
        });
      }
    });
  }
};
