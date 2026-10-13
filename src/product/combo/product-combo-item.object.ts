import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_COMBO_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_COMBO_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_COMBO_ITEM_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_COMBO_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_COMBO_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { appWritten, currencyField, manyToOneField } from 'src/shared/fields';

// The name (the variant's name) is written by code,
// so the object carries its own name field.
export default defineObject({
  universalIdentifier: PRODUCT_COMBO_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productComboItem',
  namePlural: 'productComboItems',
  labelSingular: 'Combo option',
  labelPlural: 'Combo options',
  description: 'One product the buyer can pick in a combo choice',
  icon: 'IconListCheck',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    appWritten({
      universalIdentifier: FIELD_IDS.name,
      name: 'name',
      label: 'Name',
      icon: 'IconAbc',
      type: FieldType.TEXT,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.combo,
      name: 'combo',
      label: 'Combo choice',
      icon: 'IconBoxMultiple',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_COMBO_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_COMBO_FIELD_UNIVERSAL_IDENTIFIERS.comboItems,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.product,
      name: 'product',
      label: 'Product variant',
      icon: 'IconBox',
      onDelete: OnDeleteAction.RESTRICT,
      targetObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_COMBO_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.variantComboItems,
    }),
    currencyField(FIELD_IDS.extraPrice, 'extraPrice', 'Extra price', 'IconCoin'),
  ],
});
