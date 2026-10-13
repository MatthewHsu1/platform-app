import { defineCommandMenuItem, numberOfSelectedRecords } from 'twenty-sdk/define';

import { STATUS_BUTTON_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: STATUS_BUTTON_UNIVERSAL_IDENTIFIERS.pickingNextTransfersCommandMenuItem,
  label: 'Next Transfer',
  shortLabel: 'Next Transfer',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1,
  frontComponentUniversalIdentifier: STATUS_BUTTON_UNIVERSAL_IDENTIFIERS.pickingNextTransfersFrontComponent,
});
