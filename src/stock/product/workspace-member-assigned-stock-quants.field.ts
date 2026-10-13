import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_QUANT_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.workspaceMemberAssignedStockQuants,
    name: 'assignedStockQuants',
    label: 'Counts assigned',
    icon: 'IconClipboardCheck',
    targetObjectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_QUANT_FIELD_UNIVERSAL_IDENTIFIERS.assignedUser,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
});
