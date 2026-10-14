import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { FIELDSERVICE_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import {
  FIELDSERVICE_STAGE_VALIDATION_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  FSM_STAGE_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice-stage-validation/fieldservice-stage-validation-universal-identifiers.constant';

export default defineNavigationMenuItem({
  universalIdentifier: FIELDSERVICE_STAGE_VALIDATION_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Stage rules',
  position: 12,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: FSM_STAGE_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
  folderUniversalIdentifier: FIELDSERVICE_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.folder,
});
