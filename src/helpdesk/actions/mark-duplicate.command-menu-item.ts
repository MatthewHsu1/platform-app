import {
  defineCommandMenuItem,
  isSelectAll,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
} from 'twenty-sdk/define';

import {
  MARK_DUPLICATE_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  MARK_DUPLICATE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/actions/helpdesk-actions-universal-identifiers.constant';
import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';

// Listed even when duplicate tracking is off: an availability condition cannot read an app variable.
// The dialog and the route say why the button does nothing then.
export default defineCommandMenuItem({
  universalIdentifier: MARK_DUPLICATE_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Mark as duplicate',
  shortLabel: 'Duplicate of',
  icon: 'IconCopy',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    !isSelectAll &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: MARK_DUPLICATE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
