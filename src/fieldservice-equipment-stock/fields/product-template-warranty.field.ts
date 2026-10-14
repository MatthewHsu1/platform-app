import { defineField } from 'twenty-sdk/define';

import { FIELDSERVICE_EQUIPMENT_STOCK_FIELD_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-equipment-stock/fieldservice-equipment-stock-universal-identifiers.constant';
import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { numberField } from 'src/shared/fields';

export default defineField({
  ...numberField(FIELDSERVICE_EQUIPMENT_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateWarranty, 'warranty', 'Warranty', 'IconShieldCheck', {
    decimals: 0,
    int: true,
    defaultValue: 0,
  }),
  objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
});
