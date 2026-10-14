import { OnDeleteAction, defineField } from 'twenty-sdk/define';

import {
  FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...manyToOneField({
    universalIdentifier: FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.stockPickingFsmOrder,
    name: 'fsmOrder',
    label: 'Service order',
    icon: 'IconTruck',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.fsmOrderPickings,
  }),
  objectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
});
