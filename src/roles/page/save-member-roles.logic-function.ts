import { defineLogicFunction } from 'twenty-sdk/define';

import { readRolesPage } from 'src/roles/page/read-roles-page';
import { rolesRouteHandler } from 'src/roles/page/roles-route';
import { makeSaveMemberRoles } from 'src/roles/page/save-member-roles';
import { readCallerAccess } from 'src/roles/read-caller-access';
import { ROLES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS, ROLES_ROUTE_PATHS } from 'src/roles/roles-universal-identifiers.constant';
import { syncMixedRoles } from 'src/roles/sync/sync-mixed-roles';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';

const saveMemberRoles = makeSaveMemberRoles({ readAccess: readCallerAccess, readPage: readRolesPage, sync: syncMixedRoles, readLocale: readUserLocale });
const handler = rolesRouteHandler(async (body) => ({ ...(await saveMemberRoles(body)) }));

export default defineLogicFunction({
  universalIdentifier: ROLES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.save,
  name: 'platform-roles-save',
  description: "Sets one person's building blocks: makes or reuses their mixed role, gives it to them, deletes mixed roles nobody holds and writes the row rules.",
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: ROLES_ROUTE_PATHS.save, httpMethod: 'POST', isAuthRequired: true },
});
