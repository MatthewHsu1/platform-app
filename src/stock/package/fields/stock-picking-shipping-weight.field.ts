import { defineField } from 'twenty-sdk/define';

import { numberField } from 'src/shared/fields';
import {
  STOCK_PACKAGE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...numberField(RELATION_IDS.stockPickingShippingWeight, 'shippingWeight', 'Weight for Shipping', 'IconWeight', { decimals: 2 }),
  objectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
});
