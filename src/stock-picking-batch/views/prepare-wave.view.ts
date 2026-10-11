import { defineView, ViewFilterOperand, ViewType } from 'twenty-sdk/define';

import { PREPARE_WAVE_VIEW_UNIVERSAL_IDENTIFIERS as IDS } from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import {
  STOCK_MOVE_LINE_FIELD_UNIVERSAL_IDENTIFIERS as LINE_FIELDS,
  STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';
import { keepColumnIds, listColumns } from 'src/stock/views/list-columns';
import { STOCK_MOVE_LINE_ALL_FIELDS } from 'src/stock/views/object-fields';

// Open move lines that belong to a transfer: tick some, then Add to wave.
export default defineView({
  universalIdentifier: IDS.view,
  name: 'Prepare Wave',
  objectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconWaveSine',
  fields: keepColumnIds(
    listColumns(
      IDS.view,
      [
        LINE_FIELDS.name,
        LINE_FIELDS.picking,
        LINE_FIELDS.product,
        LINE_FIELDS.location,
        LINE_FIELDS.locationDest,
        LINE_FIELDS.quantity,
        LINE_FIELDS.productUom,
      ],
      STOCK_MOVE_LINE_ALL_FIELDS,
    ),
    new Map([
      [LINE_FIELDS.picking, IDS.fieldPicking],
      [LINE_FIELDS.product, IDS.fieldProduct],
      [LINE_FIELDS.location, IDS.fieldLocation],
      [LINE_FIELDS.locationDest, IDS.fieldLocationDest],
      [LINE_FIELDS.quantity, IDS.fieldQuantity],
      [LINE_FIELDS.productUom, IDS.fieldUnit],
    ]),
  ),
  filters: [
    {
      universalIdentifier: IDS.filterState,
      fieldMetadataUniversalIdentifier: LINE_FIELDS.state,
      operand: ViewFilterOperand.IS_NOT,
      value: [MOVE_STATE.DONE],
    },
    {
      universalIdentifier: IDS.filterPicking,
      fieldMetadataUniversalIdentifier: LINE_FIELDS.picking,
      operand: ViewFilterOperand.IS_NOT_EMPTY,
      value: '',
    },
  ],
});
