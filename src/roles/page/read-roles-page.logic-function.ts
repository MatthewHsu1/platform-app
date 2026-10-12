import { defineLogicFunction } from 'twenty-sdk/define';

import { makeLoadRolesPage } from 'src/roles/page/load-roles-page';
import { readRolesPage } from 'src/roles/page/read-roles-page';
import { rolesRouteHandler } from 'src/roles/page/roles-route';
import { readCallerAccess } from 'src/roles/read-caller-access';
import { ROLES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS, ROLES_ROUTE_PATHS } from 'src/roles/roles-universal-identifiers.constant';

const loadRolesPage = makeLoadRolesPage({ readAccess: readCallerAccess, readPage: readRolesPage });
const handler = rolesRouteHandler(async () => ({ ...(await loadRolesPage()) }));

export default defineLogicFunction({
  universalIdentifier: ROLES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.page,
  name: 'platform-roles-page',
  description: "Lists the workspace members with their role and the building blocks it was made from, for Platform's Roles page.",
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: ROLES_ROUTE_PATHS.page, httpMethod: 'POST', isAuthRequired: true },
});
