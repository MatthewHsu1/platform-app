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
  PRODUCT_ATTR_EXCLUSION_VALUE_IDS_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_ATTRIBUTE_CUSTOM_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_ATTRIBUTE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_ATTRIBUTE_VALUE_LINE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_COMBO_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_COMBO_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_COMBO_PRODUCT_TEMPLATE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRICELIST_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_SUPPLIERINFO_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TAG_PRODUCT_PRODUCT_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TAG_PRODUCT_TEMPLATE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_UOM_UOM_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_VARIANT_COMBINATION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/uom/uom-universal-identifiers.constant';
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

// Restoring a record the app's own trigger undoes, or replacing link rows,
// needs the soft delete right.
const readWriteAndRestore = (objectUniversalIdentifier: string) => ({
  ...readAndWrite(objectUniversalIdentifier),
  canSoftDeleteObjectRecords: true,
});

// Destroy, for two cases a soft delete cannot cover: a link row is removed
// outright (the link triggers destroy a soft-deleted link so the same link can
// be made again), and a create that is refused is rolled back (a refused staff-created line, exclusion, variant, pricelist rule or
// combo item never existed).
const readWriteAndDestroy = (objectUniversalIdentifier: string) => ({
  ...readWriteAndRestore(objectUniversalIdentifier),
  canDestroyObjectRecords: true,
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
    readWriteAndRestore(UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndRestore(PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER),
    readAndWrite(PRODUCT_TAG_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndRestore(PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndDestroy(PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndRestore(PRODUCT_UOM_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndRestore(PRODUCT_PRICELIST_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndDestroy(PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndRestore(PRODUCT_SUPPLIERINFO_OBJECT_UNIVERSAL_IDENTIFIER),
    readAndWrite(PRODUCT_COMBO_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndDestroy(PRODUCT_COMBO_ITEM_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndDestroy(PRODUCT_COMBO_PRODUCT_TEMPLATE_REL_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndDestroy(PRODUCT_TAG_PRODUCT_TEMPLATE_REL_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndDestroy(PRODUCT_TAG_PRODUCT_PRODUCT_REL_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndDestroy(PRODUCT_TEMPLATE_UOM_UOM_REL_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndRestore(PRODUCT_ATTRIBUTE_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndRestore(PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER),
    readAndWrite(PRODUCT_ATTRIBUTE_CUSTOM_VALUE_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndDestroy(PRODUCT_TEMPLATE_ATTRIBUTE_LINE_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndRestore(PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndDestroy(PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndDestroy(PRODUCT_ATTRIBUTE_VALUE_LINE_REL_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndDestroy(PRODUCT_VARIANT_COMBINATION_OBJECT_UNIVERSAL_IDENTIFIER),
    readWriteAndDestroy(PRODUCT_ATTR_EXCLUSION_VALUE_IDS_REL_OBJECT_UNIVERSAL_IDENTIFIER),
    readAndWrite(STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.note.universalIdentifier),
    readAndWrite(STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.noteTarget.universalIdentifier),
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
