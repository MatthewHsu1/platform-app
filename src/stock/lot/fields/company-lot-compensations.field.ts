import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  STOCK_LOT_COMPENSATION_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_LOT_COMPENSATION_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  STOCK_LOT_COMPENSATION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: INVERSE_IDS.companyLotCompensations,
    name: 'lotCompensations',
    label: 'Lot stock compensations',
    icon: 'IconArrowsExchange',
    targetObjectUniversalIdentifier: STOCK_LOT_COMPENSATION_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_LOT_COMPENSATION_FIELD_UNIVERSAL_IDENTIFIERS.owner,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
});
