import { OnDeleteAction, defineField } from 'twenty-sdk/define';

import {
  FIELDSERVICE_EQUIPMENT_STOCK_FIELD_UNIVERSAL_IDENTIFIERS,
  FIELDSERVICE_EQUIPMENT_STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/fieldservice-equipment-stock/fieldservice-equipment-stock-universal-identifiers.constant';
import { FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { appWritten, manyToOneField } from 'src/shared/fields';
import { STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// Where the newest stock of the serial is. Only app code writes it.
export default defineField({
  ...appWritten(
    manyToOneField({
      universalIdentifier: FIELDSERVICE_EQUIPMENT_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.fsmEquipmentCurrentStockLocation,
      name: 'currentStockLocation',
      label: 'Current inventory location',
      icon: 'IconMapPin',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FIELDSERVICE_EQUIPMENT_STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockLocationCurrentStockFsmEquipments,
    }),
  ),
  objectUniversalIdentifier: FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER,
});
