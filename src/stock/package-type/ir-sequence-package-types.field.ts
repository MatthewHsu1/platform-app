import { defineField } from 'twenty-sdk/define';

import { IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/base/base-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FOREIGN_IDS,
  STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FOREIGN_IDS.irSequencePackageTypes,
    name: 'packageTypes',
    label: 'Package types',
    icon: 'IconPackage',
    targetObjectUniversalIdentifier: STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS.referenceSequence,
  }),
  objectUniversalIdentifier: IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER,
});
