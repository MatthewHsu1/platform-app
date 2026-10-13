import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOneField } from 'src/shared/fields';
import {
  STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// Empty means the seeded Vendors location.
export default defineField({
  ...manyToOneField({
    universalIdentifier: FIELD_IDS.personPropertyStockSupplier,
    name: 'propertyStockSupplier',
    label: 'Vendor location',
    icon: 'IconMapPin',
    targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS.supplierPeople,
    onDelete: OnDeleteAction.SET_NULL,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
});
