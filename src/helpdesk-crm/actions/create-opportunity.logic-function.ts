import { defineLogicFunction } from 'twenty-sdk/define';

import { CaseActionError } from 'src/helpdesk/actions/case-action-error';
import { caseRouteHandler, findCaseAsUser, readCaseId } from 'src/helpdesk/actions/case-action-route';
import { HELPDESK_ACTION_MESSAGES } from 'src/helpdesk/actions/helpdesk-action-messages.constant';
import {
  CREATE_OPPORTUNITY_ROUTE_PATH,
  HELPDESK_CRM_ACTION_UNIVERSAL_IDENTIFIERS,
} from 'src/helpdesk-crm/helpdesk-crm-universal-identifiers.constant';
import { planOpportunityFromCase } from 'src/helpdesk-crm/utils/plan-opportunity-from-case.util';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { addNote } from 'src/shared/triggers/put-back';
import { GraphqlForbiddenError, requireData, twentyGraphql } from 'src/shared/twenty-graphql';

const idOrNull = (value: unknown) => (typeof value === 'string' && value.length > 0 ? value : null);

// The opportunity is made as the clicking user, so their sales rights and the lead rules apply; the note on
// the case is written by the app.
const handler = caseRouteHandler(async (body) => {
  const caseId = readCaseId(body);

  if (caseId === null) {
    throw new CaseActionError(HELPDESK_ACTION_MESSAGES.selectOneCase, {}, 400);
  }
  const row = await findCaseAsUser(caseId);

  if (row === null) {
    throw new CaseActionError(HELPDESK_ACTION_MESSAGES.caseNotFound, {}, 404);
  }
  const plan = planOpportunityFromCase({ case: row, salespersonId: idOrNull(body.salespersonId), crmTeamId: idOrNull(body.crmTeamId) });
  const data = { ...plan, description: plan.description === null ? null : { markdown: plan.description.markdown ?? '' } };
  let lead: { id: string; name: string | null };

  try {
    lead = requireData(
      await twentyGraphql<{ createCrmLead: { id: string; name: string | null } }>(
        'person',
        `mutation CreateOpportunity($data: CrmLeadCreateInput!) { createCrmLead(data: $data) { id name } }`,
        { data },
      ),
      'Create the opportunity',
    ).createCrmLead;
  } catch (error) {
    if (error instanceof GraphqlForbiddenError) {
      throw new CaseActionError(HELPDESK_ACTION_MESSAGES.needsSalesRights);
    }
    throw error;
  }
  const locale = await readUserLocale();
  const name = lead.name ?? '';

  await addNote({
    objectSingular: 'helpdeskTicket',
    recordId: caseId,
    title: translate(locale, HELPDESK_ACTION_MESSAGES.opportunityNoteTitle),
    body: translate(locale, HELPDESK_ACTION_MESSAGES.opportunityNoteBody, { name }),
  });

  return { leadId: lead.id, leadName: name };
});

export default defineLogicFunction({
  universalIdentifier: HELPDESK_CRM_ACTION_UNIVERSAL_IDENTIFIERS.createOpportunityLogicFunction,
  name: 'create-opportunity-from-work-case',
  description: 'Creates an opportunity from a work case, for the chosen salesperson and sales team, and links it to the case.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: CREATE_OPPORTUNITY_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
