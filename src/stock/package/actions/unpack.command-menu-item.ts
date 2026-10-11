import {
  defineCommandMenuItem,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
} from 'twenty-sdk/define';

import {
  UNPACK_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  UNPACK_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/package/actions/package-actions-universal-identifiers.constant';
import { STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// The route checks that each package holds something.
export default defineCommandMenuItem({
  universalIdentifier: UNPACK_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Unpack',
  shortLabel: 'Unpack',
  icon: 'IconPackageExport',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords > 0 &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: UNPACK_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
