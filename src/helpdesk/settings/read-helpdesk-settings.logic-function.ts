import { defineLogicFunction } from 'twenty-sdk/define';

import { settingsRoute } from 'src/crm/settings/settings-route';
import {
  READ_HELPDESK_SETTINGS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  READ_HELPDESK_SETTINGS_ROUTE_PATH,
} from 'src/helpdesk/settings/helpdesk-settings-universal-identifiers.constant';
import { holdsHelpdeskAdministrator } from 'src/helpdesk/settings/utils/holds-helpdesk-administrator.util';
import { readHelpdeskSettings } from 'src/helpdesk/read-helpdesk-settings';
import { type CaseStageRow } from 'src/helpdesk/types/case-stage-row.type';
import { sortCaseStages } from 'src/helpdesk/utils/applicable-stages.util';
import { readCallerAccessOrNull } from 'src/roles/read-caller-access';
import { jsonResponse } from 'src/shared/route-response';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';

// Any signed-in person may look; the stages are read with their own rights. Only the administrators may change.
const handler = settingsRoute(async () => {
  const access = await readCallerAccessOrNull();
  const stages = requireData(
    await twentyGraphql<{ helpdeskTicketStages: { edges: { node: { id: string; name: string | null; sequence: number | null; createdAt: string } }[] } }>(
      'person',
      '{ helpdeskTicketStages(first: 200) { edges { node { id name sequence createdAt } } } }',
    ),
    'List the stages',
  ).helpdeskTicketStages.edges.map(({ node }) => node);
  const ordered = sortCaseStages(stages.map((stage): CaseStageRow => ({ ...stage, sequence: stage.sequence ?? 0, active: true, unattended: false, closed: false, fold: false, teamIds: [] })));

  return jsonResponse(200, {
    ...(await readHelpdeskSettings()),
    stages: ordered.map((stage) => ({ id: stage.id, name: stage.name ?? '' })),
    canEdit: access !== null && holdsHelpdeskAdministrator(access),
  });
});

export default defineLogicFunction({
  universalIdentifier: READ_HELPDESK_SETTINGS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'read-helpdesk-settings',
  description: 'Returns the work case settings and the stages to choose from, for the settings page.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: { path: READ_HELPDESK_SETTINGS_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
