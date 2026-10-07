import {
  defineApplicationRole,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  SystemPermissionFlag,
} from 'twenty-sdk/define';

import {
  APP_DISPLAY_NAME,
  FUNCTION_ROLE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import {
  CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_LOST_REASON_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/crm-universal-identifiers.constant';
import {
  UTM_CAMPAIGN_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_MEDIUM_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

const readAndWrite = (objectUniversalIdentifier: string) => ({
  objectUniversalIdentifier,
  canReadObjectRecords: true,
  canUpdateObjectRecords: true,
  canSoftDeleteObjectRecords: false,
  canDestroyObjectRecords: false,
});

const readOnly = (objectUniversalIdentifier: string) => ({
  objectUniversalIdentifier,
  canReadObjectRecords: true,
  canUpdateObjectRecords: false,
  canSoftDeleteObjectRecords: false,
  canDestroyObjectRecords: false,
});

// Buttons and the row access settings page run as the signed-in user
// intersected with this role, so a user gains nothing through it. The
// install hook runs with this role alone: Data Model and Views let it make
// the staff lists and the Pipeline board. Applications and Roles let the
// settings page save Platform's row access variable and list roles. With
// them the role can also list installed apps and edit timeline activity type
// labels; Twenty refuses role changes, installs and workspace settings to
// application tokens.
export default defineApplicationRole({
  universalIdentifier: FUNCTION_ROLE_UNIVERSAL_IDENTIFIER,
  label: `${APP_DISPLAY_NAME} function role`,
  description:
    'Runs the install hook, the lead buttons and the row access settings page.',
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canAccessAllTools: false,
  canBeAssignedToUsers: false,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  objectPermissions: [
    readAndWrite(CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER),
    readAndWrite(CRM_LOST_REASON_OBJECT_UNIVERSAL_IDENTIFIER),
    readAndWrite(UTM_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER),
    readAndWrite(UTM_MEDIUM_OBJECT_UNIVERSAL_IDENTIFIER),
    readAndWrite(UTM_CAMPAIGN_OBJECT_UNIVERSAL_IDENTIFIER),
    readAndWrite(STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier),
    readAndWrite(STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier),
    readOnly(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
    ),
  ],
  fieldPermissions: [],
  permissionFlagUniversalIdentifiers: [
    SystemPermissionFlag.DATA_MODEL,
    SystemPermissionFlag.VIEWS,
    SystemPermissionFlag.APPLICATIONS,
    SystemPermissionFlag.ROLES,
  ],
});
