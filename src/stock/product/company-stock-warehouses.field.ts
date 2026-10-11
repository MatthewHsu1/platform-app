import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_WAREHOUSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.companyStockWarehouses,
    name: 'stockWarehouses',
    label: 'Warehouses at this address',
    icon: 'IconBuildingWarehouse',
    targetObjectUniversalIdentifier: STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_WAREHOUSE_FIELD_UNIVERSAL_IDENTIFIERS.partner,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
});
