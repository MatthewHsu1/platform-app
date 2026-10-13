import { defineField } from 'twenty-sdk/define';

import { appTextField } from 'src/shared/fields';
import { ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS } from 'src/stock/routing-universal-identifiers.constant';
import { STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// The claim run that planned the move, so a crashed procurement resumes instead of planning twice.
export default defineField({
  ...appTextField(ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockMoveProcurementRun, 'procurementRun', 'Procurement run', 'IconKey'),
  objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
});
