import { defineLogicFunction } from 'twenty-sdk/define';

import { runManualAssignment } from 'src/crm/assignment/assignment-route';
import { ASSIGN_NOW_ROUTE_PATH, ASSIGNMENT_DOOR_UNIVERSAL_IDENTIFIERS } from 'src/crm/assignment/assignment-universal-identifiers.constant';
import { readSettingsDoorTeamIds } from 'src/crm/assignment/door-teams';

const handler = () =>
  runManualAssignment({
    door: 'SETTINGS_BUTTON',
    readTeamIds: async () => ({ teamIds: await readSettingsDoorTeamIds() }),
  });

export default defineLogicFunction({
  universalIdentifier: ASSIGNMENT_DOOR_UNIVERSAL_IDENTIFIERS.assignNowRoute,
  name: 'crm-assign-now',
  description: 'Assigns unassigned leads to every active team that takes part, and to their salespeople, now.',
  timeoutSeconds: 900,
  handler,
  httpRouteTriggerSettings: { path: ASSIGN_NOW_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
