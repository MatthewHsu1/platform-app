import { defineField } from 'twenty-sdk/define';

import { FIELDSERVICE_EQUIPMENT_STOCK_FIELD_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-equipment-stock/fieldservice-equipment-stock-universal-identifiers.constant';
import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { booleanField } from 'src/shared/fields';

export default defineField({
  ...booleanField(
    FIELDSERVICE_EQUIPMENT_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateCreateFsmEquipment,
    'createFsmEquipment',
    'Create equipment',
    'IconTool',
    false,
  ),
  objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
});
