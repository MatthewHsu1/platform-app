import { defineObject, FieldType } from 'twenty-sdk/define';

import {
  PRODUCT_TAG_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_TAG_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_FIELD_IDS,
  PRODUCT_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TAG_PRODUCT_PRODUCT_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TAG_PRODUCT_PRODUCT_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TAG_PRODUCT_TEMPLATE_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TAG_PRODUCT_TEMPLATE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { booleanField, filesField, numberField, oneToManyField } from 'src/shared/fields';

export default defineObject({
  universalIdentifier: PRODUCT_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productTag',
  namePlural: 'productTags',
  labelSingular: 'Product tag',
  labelPlural: 'Product tags',
  description: 'A label staff put on products to find them again',
  icon: 'IconTag',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    {
      universalIdentifier: FIELD_IDS.name,
      name: 'name',
      label: 'Name',
      icon: 'IconAbc',
      type: FieldType.TEXT,
    },
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', {
      decimals: 0,
      int: true,
      defaultValue: 10,
    }),
    {
      universalIdentifier: FIELD_IDS.color,
      name: 'color',
      label: 'Color',
      icon: 'IconPalette',
      type: FieldType.TEXT,
      defaultValue: "'#3C3C3C'",
    },
    booleanField(FIELD_IDS.visibleToCustomers, 'visibleToCustomers', 'Visible to customers', 'IconEye', true),
    filesField(FIELD_IDS.image, 'image', 'Image', 'IconPhoto'),
    oneToManyField({
      universalIdentifier: INVERSE_FIELD_IDS.productTemplateLinks,
      name: 'productTemplateLinks',
      label: 'Product links',
      icon: 'IconLink',
      targetObjectUniversalIdentifier: PRODUCT_TAG_PRODUCT_TEMPLATE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_TAG_PRODUCT_TEMPLATE_REL_FIELD_UNIVERSAL_IDENTIFIERS.productTag,
    }),
    oneToManyField({
      universalIdentifier: INVERSE_FIELD_IDS.productProductLinks,
      name: 'productProductLinks',
      label: 'Variant links',
      icon: 'IconLink',
      targetObjectUniversalIdentifier: PRODUCT_TAG_PRODUCT_PRODUCT_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_TAG_PRODUCT_PRODUCT_REL_FIELD_UNIVERSAL_IDENTIFIERS.productTag,
    }),
  ],
});
