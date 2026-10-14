import { defineField } from 'twenty-sdk/define';

import {
  FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS,
  FIELDSERVICE_STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';
import { STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELDSERVICE_STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockWarehouseFsmPersons,
    name: 'fsmPersons',
    label: 'Field service workers',
    icon: 'IconUsers',
    targetObjectUniversalIdentifier: FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.fsmPersonDefaultWarehouse,
  }),
  objectUniversalIdentifier: STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
});
