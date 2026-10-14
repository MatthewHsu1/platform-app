import { OnDeleteAction, defineField } from 'twenty-sdk/define';

import {
  FIELDSERVICE_EQUIPMENT_STOCK_FIELD_UNIVERSAL_IDENTIFIERS,
  FIELDSERVICE_EQUIPMENT_STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/fieldservice-equipment-stock/fieldservice-equipment-stock-universal-identifiers.constant';
import { FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';
import { STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// The serial of the machine. The lot lists its equipment through the inverse field.
export default defineField({
  ...manyToOneField({
    universalIdentifier: FIELDSERVICE_EQUIPMENT_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.fsmEquipmentLot,
    name: 'lot',
    label: 'Serial #',
    icon: 'IconBarcode',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELDSERVICE_EQUIPMENT_STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockLotFsmEquipments,
  }),
  objectUniversalIdentifier: FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER,
});
