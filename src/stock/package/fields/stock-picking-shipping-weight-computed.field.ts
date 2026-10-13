import { defineField } from 'twenty-sdk/define';

import { appWritten, numberField } from 'src/shared/fields';
import {
  STOCK_PACKAGE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// The weight the app last computed. A typed shipping weight that differs from
// it is kept until something the weight depends on changes.
export default defineField({
  ...appWritten(
    numberField(RELATION_IDS.stockPickingShippingWeightComputed, 'shippingWeightComputed', 'Computed shipping weight', 'IconWeight', {
      decimals: 2,
    }),
  ),
  objectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
});
