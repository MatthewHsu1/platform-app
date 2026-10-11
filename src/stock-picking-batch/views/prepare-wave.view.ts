import { defineView, ViewFilterOperand, ViewType } from 'twenty-sdk/define';

import { PREPARE_WAVE_VIEW_UNIVERSAL_IDENTIFIERS as IDS } from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import {
  STOCK_MOVE_LINE_FIELD_UNIVERSAL_IDENTIFIERS as LINE_FIELDS,
  STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// Open move lines that belong to a transfer: tick some, then Add to wave.
export default defineView({
  universalIdentifier: IDS.view,
  name: 'Prepare Wave',
  objectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconWaveSine',
  fields: [
    { universalIdentifier: IDS.fieldPicking, fieldMetadataUniversalIdentifier: LINE_FIELDS.picking, position: 0, isVisible: true },
    { universalIdentifier: IDS.fieldProduct, fieldMetadataUniversalIdentifier: LINE_FIELDS.product, position: 1, isVisible: true },
    { universalIdentifier: IDS.fieldLocation, fieldMetadataUniversalIdentifier: LINE_FIELDS.location, position: 2, isVisible: true },
    {
      universalIdentifier: IDS.fieldLocationDest,
      fieldMetadataUniversalIdentifier: LINE_FIELDS.locationDest,
      position: 3,
      isVisible: true,
    },
    { universalIdentifier: IDS.fieldQuantity, fieldMetadataUniversalIdentifier: LINE_FIELDS.quantity, position: 4, isVisible: true },
    { universalIdentifier: IDS.fieldUnit, fieldMetadataUniversalIdentifier: LINE_FIELDS.productUom, position: 5, isVisible: true },
  ],
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
