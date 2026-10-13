import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  STOCK_PICKING_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELD_IDS.personStockPickings,
    name: 'stockPickings',
    label: 'Transfers',
    icon: 'IconTruck',
    targetObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_PICKING_FIELD_UNIVERSAL_IDENTIFIERS.person,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
