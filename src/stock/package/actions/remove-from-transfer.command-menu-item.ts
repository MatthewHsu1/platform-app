import {
  defineCommandMenuItem,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
  targetObjectWritePermissions,
} from 'twenty-sdk/define';

import {
  REMOVE_FROM_TRANSFER_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  REMOVE_FROM_TRANSFER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/package/actions/package-actions-universal-identifiers.constant';
import { STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// The route checks that each package has open lines.
export default defineCommandMenuItem({
  universalIdentifier: REMOVE_FROM_TRANSFER_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Remove from Transfer',
  shortLabel: 'Remove',
  icon: 'IconPackageOff',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords > 0 &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false) &&
    targetObjectWritePermissions.stockMoveLine,
  frontComponentUniversalIdentifier: REMOVE_FROM_TRANSFER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
