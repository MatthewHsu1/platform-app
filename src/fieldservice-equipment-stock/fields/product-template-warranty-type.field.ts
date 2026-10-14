import { defineField } from 'twenty-sdk/define';

import { FIELDSERVICE_EQUIPMENT_STOCK_FIELD_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-equipment-stock/fieldservice-equipment-stock-universal-identifiers.constant';
import { WARRANTY_UNIT, WARRANTY_UNIT_OPTIONS } from 'src/fieldservice/fieldservice-options.constant';
import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { selectField } from 'src/shared/fields';

export default defineField({
  ...selectField(
    FIELDSERVICE_EQUIPMENT_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateWarrantyType,
    'warrantyType',
    'Warranty unit',
    'IconShieldCheck',
    WARRANTY_UNIT.MONTH,
    WARRANTY_UNIT_OPTIONS,
  ),
  objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
});
