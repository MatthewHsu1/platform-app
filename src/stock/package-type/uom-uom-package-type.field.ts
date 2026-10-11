import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOneField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FOREIGN_IDS,
  STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import { UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/uom/uom-universal-identifiers.constant';

// The package type a packaging unit fills; its routes steer rule selection.
export default defineField({
  ...manyToOneField({
    universalIdentifier: FOREIGN_IDS.uomUomPackageType,
    name: 'packageType',
    label: 'Package Type',
    icon: 'IconPackage',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS.uoms,
  }),
  objectUniversalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
});
