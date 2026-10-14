import { OnDeleteAction, defineField } from 'twenty-sdk/define';

import {
  FIELDSERVICE_EQUIPMENT_STOCK_FIELD_UNIVERSAL_IDENTIFIERS,
  FIELDSERVICE_EQUIPMENT_STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/fieldservice-equipment-stock/fieldservice-equipment-stock-universal-identifiers.constant';
import { FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

export default defineField({
  ...manyToOneField({
    universalIdentifier: FIELDSERVICE_EQUIPMENT_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.fsmEquipmentProduct,
    name: 'product',
    label: 'Product',
    icon: 'IconBoxMultiple',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELDSERVICE_EQUIPMENT_STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.productProductFsmEquipments,
  }),
  objectUniversalIdentifier: FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER,
});
