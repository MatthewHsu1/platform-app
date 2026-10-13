import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  PRODUCT_PRICELIST_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_PRICELIST_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_PRICELIST_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

// The pricelist given to a company.
export default defineField({
  ...manyToOneField({
    universalIdentifier: PRODUCT_PRICELIST_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.companyPropertyProductPricelist,
    name: 'propertyProductPricelist',
    label: 'Pricelist',
    icon: 'IconListDetails',
    targetObjectUniversalIdentifier: PRODUCT_PRICELIST_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: PRODUCT_PRICELIST_FIELD_UNIVERSAL_IDENTIFIERS.companies,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
});
