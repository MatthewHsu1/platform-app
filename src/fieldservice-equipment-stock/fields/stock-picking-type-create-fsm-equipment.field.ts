import { defineField } from 'twenty-sdk/define';

import { FIELDSERVICE_EQUIPMENT_STOCK_FIELD_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-equipment-stock/fieldservice-equipment-stock-universal-identifiers.constant';
import { booleanField } from 'src/shared/fields';
import { STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...booleanField(
    FIELDSERVICE_EQUIPMENT_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.stockPickingTypeCreateFsmEquipment,
    'createFsmEquipment',
    'Create equipment',
    'IconTool',
    false,
  ),
  objectUniversalIdentifier: STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
});
