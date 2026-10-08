import { defineObject } from 'twenty-sdk/define';

import {
  PRODUCT_COMBO_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_COMBO_ITEM_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_COMBO_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_COMBO_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_COMBO_PRODUCT_TEMPLATE_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_COMBO_PRODUCT_TEMPLATE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { numberField, oneToManyField } from 'src/shared/fields';

// The name is Twenty's own name field.
export default defineObject({
  universalIdentifier: PRODUCT_COMBO_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productCombo',
  namePlural: 'productCombos',
  labelSingular: 'Combo choice',
  labelPlural: 'Combo choices',
  description: 'A list of products the buyer picks one from inside a combo product',
  icon: 'IconBoxMultiple',
  fields: [
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', {
      decimals: 0,
      int: true,
      defaultValue: 10,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.comboItems,
      name: 'comboItems',
      label: 'Options',
      icon: 'IconListCheck',
      targetObjectUniversalIdentifier: PRODUCT_COMBO_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_COMBO_ITEM_FIELD_UNIVERSAL_IDENTIFIERS.combo,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.productTemplateLinks,
      name: 'productTemplateLinks',
      label: 'Product links',
      icon: 'IconLink',
      targetObjectUniversalIdentifier: PRODUCT_COMBO_PRODUCT_TEMPLATE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_COMBO_PRODUCT_TEMPLATE_REL_FIELD_UNIVERSAL_IDENTIFIERS.productCombo,
    }),
  ],
});
