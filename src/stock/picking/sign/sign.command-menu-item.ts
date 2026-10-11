import { defineCommandMenuItem, everyEquals, numberOfSelectedRecords, objectPermissions, selectedRecords } from 'twenty-sdk/define';

import { SIGNATURE_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// Offered on a delivery before and after it is done, to people who may change transfers; the pop-up
// says so when the delivery is already signed.
export default defineCommandMenuItem({
  universalIdentifier: SIGNATURE_UNIVERSAL_IDENTIFIERS.commandMenuItem,
  label: 'Sign',
  icon: 'IconSignature',
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    everyEquals(selectedRecords, 'pickingTypeCode', 'OUTGOING') &&
    everyEquals(objectPermissions, 'canUpdateObjectRecords', true),
  frontComponentUniversalIdentifier: SIGNATURE_UNIVERSAL_IDENTIFIERS.frontComponent,
});
