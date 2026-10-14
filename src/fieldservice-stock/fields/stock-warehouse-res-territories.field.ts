import { defineField } from 'twenty-sdk/define';

import { RES_TERRITORY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/base-territory/base-territory-universal-identifiers.constant';
import {
  FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS,
  FIELDSERVICE_STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';
import { STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELDSERVICE_STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockWarehouseResTerritories,
    name: 'resTerritories',
    label: 'Territories',
    icon: 'IconMapPin',
    targetObjectUniversalIdentifier: RES_TERRITORY_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.resTerritoryWarehouse,
  }),
  objectUniversalIdentifier: STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
});
