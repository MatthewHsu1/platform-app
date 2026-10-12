import { defineLogicFunction } from 'twenty-sdk/define';

import {
  readCompanyLabel,
  refuseUnconvertible,
  requestedId,
  resolveConvertDefaults,
} from 'src/crm/lead/actions/convert-lead-shared';
import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import { leadRouteHandler, readLeadId, readLeadsAsUser, SELECT_ONE_LEAD } from 'src/crm/lead/actions/lead-action-route';
import {
  CONVERT_LEAD_PREPARE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  CONVERT_LEAD_PREPARE_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { optionalId } from 'src/shared/utils/optional-id.util';

// Two leads or more found (the lead itself counts) suggest a merge.
const MERGE_THRESHOLD = 2;

const handler = leadRouteHandler(async (body) => {
  const leadId = readLeadId(body);

  if (leadId === null) {
    throw new LeadActionError(SELECT_ONE_LEAD, {}, 400);
  }

  const [lead] = await readLeadsAsUser([leadId]);

  refuseUnconvertible(lead);

  const customerAction = body.customerAction === 'CREATE' || body.customerAction === 'EXIST' ? body.customerAction : undefined;
  const { defaults, duplicates, stages, person } = await resolveConvertDefaults(lead, {
    customerAction,
    personId: requestedId(body, 'personId'),
    companyId: requestedId(body, 'companyId'),
    salespersonId: requestedId(body, 'salespersonId'),
    teamId: requestedId(body, 'teamId'),
  });
  const stageNames = new Map(stages.map((stage) => [stage.id, stage.name]));
  const personName = [person?.name?.firstName, person?.name?.lastName].filter((part) => (part ?? '') !== '').join(' ');

  return {
    ...defaults,
    // Chosen once, when the dialog opens; later calls keep the dialog's choice.
    conversion: optionalId(body.conversion) ?? (duplicates.length >= MERGE_THRESHOLD ? 'MERGE' : 'CONVERT'),
    showCompany: defaults.customerAction === 'CREATE' && (lead.partnerName ?? '').trim().length === 0,
    personLabel:
      person === null ? null : [personName, person.emails?.primaryEmail ?? ''].filter((part) => part !== '').join(' · '),
    companyLabel: await readCompanyLabel(defaults.companyId),
    duplicates: duplicates.map((duplicate) => ({
      id: duplicate.id,
      name: duplicate.name,
      leadType: duplicate.leadType,
      email: duplicate.emailFrom?.primaryEmail ?? null,
      stage: duplicate.stageId === null ? null : (stageNames.get(duplicate.stageId) ?? null),
    })),
  };
});

export default defineLogicFunction({
  universalIdentifier: CONVERT_LEAD_PREPARE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'convert-lead-prepare',
  description: 'Computes the convert dialog values for a lead: customer, duplicates, salesperson and team.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: CONVERT_LEAD_PREPARE_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
