import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  PRODUCT_PRICELIST_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_SUPPLIERINFO_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_SUPPLIERINFO_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: PRODUCT_PRICELIST_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.companyProductSupplierinfos,
    name: 'productSupplierinfos',
    label: 'Vendor prices',
    icon: 'IconTruckDelivery',
    targetObjectUniversalIdentifier: PRODUCT_SUPPLIERINFO_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: PRODUCT_SUPPLIERINFO_FIELD_UNIVERSAL_IDENTIFIERS.partner,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
});
