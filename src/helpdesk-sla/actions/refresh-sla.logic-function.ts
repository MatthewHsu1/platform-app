import { defineLogicFunction } from 'twenty-sdk/define';

import { CaseActionError } from 'src/helpdesk/actions/case-action-error';
import { caseRouteHandler, findCaseAsUser, readCaseId } from 'src/helpdesk/actions/case-action-route';
import { HELPDESK_ACTION_MESSAGES } from 'src/helpdesk/actions/helpdesk-action-messages.constant';
import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import {
  HELPDESK_SLA_ACTION_UNIVERSAL_IDENTIFIERS,
  REFRESH_SLA_ROUTE_PATH,
} from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { attachSlas } from 'src/helpdesk-sla/sla-engine-bound';
import { requireUpdateRights } from 'src/shared/object-rights';

// Rows are app fields, written with the app token, so the user's right to change the case is checked first.
// The refresh runs whether or not the team uses service levels: it drops the rows of policies that no longer
// apply and adds the rows of new ones, keeping the rest.
const handler = caseRouteHandler(async (body) => {
  const caseId = readCaseId(body);

  if (caseId === null) {
    throw new CaseActionError(HELPDESK_ACTION_MESSAGES.selectOneCase, {}, 400);
  }
  if ((await findCaseAsUser(caseId)) === null) {
    throw new CaseActionError(HELPDESK_ACTION_MESSAGES.caseNotFound, {}, 404);
  }
  await requireUpdateRights([HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER]);
  await attachSlas([caseId], { now: new Date().toISOString(), onlyWhenTeamUsesSla: false, mode: 'refresh' });

  return { caseId };
});

export default defineLogicFunction({
  universalIdentifier: HELPDESK_SLA_ACTION_UNIVERSAL_IDENTIFIERS.refreshSlaLogicFunction,
  name: 'refresh-work-case-sla',
  description: 'Brings the SLA rows of a work case up to date with the policies that apply to it now.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: REFRESH_SLA_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
