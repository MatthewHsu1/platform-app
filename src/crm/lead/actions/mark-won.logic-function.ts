import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';

import {
  applyLeadUpdate,
  findLead,
  jsonResponse,
  readBody,
  readLeadId,
} from 'src/crm/lead/actions/lead-action-route';
import {
  MARK_WON_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  MARK_WON_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { STAGE_FIELD_NAME } from 'src/crm/crm-options.constant';
import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { planMarkWon } from 'src/crm/lead/actions/utils/plan-won-lost.util';
import { twentyMetadata } from 'src/shared/twenty-graphql';

// Stage is a staff list, so its options are read at click time from the
// metadata API; no Stage field means no options. GraphQL introspection does
// not work here: an app token's schema leaves out workspace-owned fields.
const readStageOptionValues = async () => {
  const found = await twentyMetadata<{
    objects: {
      edges: {
        node: { fieldsList: { name: string; options: { value: string }[] | null }[] };
      }[];
    };
  }>(
    'person',
    `query LeadStageOptions($objectUniversalIdentifier: UUID!) {
      objects(filter: { universalIdentifier: { eq: $objectUniversalIdentifier } }, paging: { first: 1 }) {
        edges { node { fieldsList { name options } } }
      }
    }`,
    { objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER },
  );
  const stage = found.data?.objects.edges[0]?.node.fieldsList.find(
    (field) => field.name === STAGE_FIELD_NAME,
  );

  return (stage?.options ?? []).map((option) => option.value);
};

const handler = async (payload: RoutePayload) => {
  const leadId = readLeadId(readBody(payload));

  if (leadId === null) {
    return jsonResponse(400, { error: 'leadId is required.' });
  }

  const lead = await findLead<{ wonStatus: string | null }>(leadId, 'wonStatus');

  if (lead === null) {
    return jsonResponse(404, { error: 'Lead not found.' });
  }

  return applyLeadUpdate(
    leadId,
    planMarkWon({
      wonStatus: lead.wonStatus,
      stageOptionValues: await readStageOptionValues(),
      now: new Date().toISOString(),
    }),
  );
};

export default defineLogicFunction({
  universalIdentifier: MARK_WON_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'mark-lead-won',
  description: 'Marks a lead won, at 100 %, in the Won stage.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: MARK_WON_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
