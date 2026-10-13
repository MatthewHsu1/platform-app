import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { appWritten, manyToOneField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import { STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...appWritten(
    manyToOneField({
      universalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockWarehouseMtoPull,
      name: 'mtoPull',
      label: 'MTO rule',
      icon: 'IconArrowsSplit',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS.warehousesMto,
    }),
  ),
  objectUniversalIdentifier: STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
});
