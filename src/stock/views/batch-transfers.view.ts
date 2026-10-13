import { defineView, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { BATCH_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { STOCK_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';
import { listColumns } from 'src/stock/views/list-columns';
import { STOCK_PICKING_BATCH_ALL_FIELDS } from 'src/stock/views/object-fields';
import { booleanIs, selectIs, sortBy } from 'src/stock/views/view-helpers';

// Open batches only, as the list opens by default; staff remove the state
// filter in the view bar to see done and cancelled ones.
export const batchViewParts = (viewUniversalIdentifier: string, isWave: boolean) => ({
  objectUniversalIdentifier: STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  filters: [
    booleanIs(viewUniversalIdentifier, F.isWave, isWave),
    selectIs(viewUniversalIdentifier, F.state, [BATCH_STATE.DRAFT, BATCH_STATE.IN_PROGRESS]),
  ],
  sorts: [sortBy(viewUniversalIdentifier, F.name, ViewSortDirection.DESC)],
  fields: listColumns(
    viewUniversalIdentifier,
    [F.name, F.description, F.scheduledDate, F.responsible, F.pickingType, F.state],
    STOCK_PICKING_BATCH_ALL_FIELDS,
  ),
});

export default defineView({
  universalIdentifier: VIEWS.batchTransfers,
  name: 'Batch Transfers',
  icon: 'IconBoxMultiple',
  position: 1,
  ...batchViewParts(VIEWS.batchTransfers, false),
});
