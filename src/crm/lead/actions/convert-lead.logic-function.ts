import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';

import {
  findLead,
  jsonResponse,
  readBody,
  readLeadId,
} from 'src/crm/lead/actions/lead-action-route';
import {
  CONVERT_LEAD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  CONVERT_LEAD_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import {
  type LeadToConvert,
  planLeadConversion,
} from 'src/crm/lead/actions/utils/plan-lead-conversion.util';
import { describeGraphqlErrors, twentyGraphql } from 'src/shared/twenty-graphql';

const findPersonIdByEmail = async (email: string | null | undefined) => {
  if (!email) {
    return null;
  }

  const found = await twentyGraphql<{ people: { edges: { node: { id: string } }[] } }>(
    'person',
    `query PersonByEmail($email: String!) {
      people(filter: { emails: { primaryEmail: { eq: $email } } }, first: 1) {
        edges { node { id } }
      }
    }`,
    { email },
  );

  return found.data?.people.edges[0]?.node.id ?? null;
};

const findCompanyIdByName = async (name: string | null) => {
  if (!name?.trim()) {
    return null;
  }

  const found = await twentyGraphql<{ companies: { edges: { node: { id: string } }[] } }>(
    'person',
    `query CompanyByName($name: String!) {
      companies(filter: { name: { eq: $name } }, first: 1) { edges { node { id } } }
    }`,
    { name: name.trim() },
  );

  return found.data?.companies.edges[0]?.node.id ?? null;
};

const create = async (objectName: 'Company' | 'Person', data: Record<string, unknown>) => {
  const created = await twentyGraphql<Record<string, { id: string } | null>>(
    'person',
    `mutation CreateForConvert($data: ${objectName}CreateInput!) {
      create${objectName}(data: $data) { id }
    }`,
    { data },
  );
  const id = created.data?.[`create${objectName}`]?.id;

  if (id === undefined) {
    throw new Error(
      `Could not create the ${objectName.toLowerCase()}: ${describeGraphqlErrors(created.errors)}`,
    );
  }

  return id;
};

// Runs as the clicking user: row rules apply to the lead, people and companies.
const handler = async (payload: RoutePayload) => {
  const leadId = readLeadId(readBody(payload));

  if (leadId === null) {
    return jsonResponse(400, { error: 'leadId is required.' });
  }

  const lead = await findLead<LeadToConvert>(
    leadId,
    `id name leadType wonStatus personId companyId contactName partnerName jobPosition
     emailFrom { primaryEmail }
     phone { primaryPhoneNumber primaryPhoneCountryCode primaryPhoneCallingCode }
     website { primaryLinkUrl }
     contactAddress {
       addressStreet1 addressStreet2 addressCity addressState addressPostcode addressCountry
     }`,
  );

  if (lead === null) {
    return jsonResponse(404, { error: 'Lead not found.' });
  }

  const plan = planLeadConversion({
    lead,
    foundPersonId: lead.personId === null ? await findPersonIdByEmail(lead.emailFrom?.primaryEmail) : null,
    foundCompanyId: lead.companyId === null ? await findCompanyIdByName(lead.partnerName) : null,
    now: new Date().toISOString(),
  });

  if (plan.kind === 'refuse') {
    return jsonResponse(409, { error: plan.reason });
  }

  try {
    const companyId =
      plan.company === null
        ? null
        : 'id' in plan.company
          ? plan.company.id
          : await create('Company', plan.company.create);
    const personId =
      plan.person === null
        ? null
        : 'id' in plan.person
          ? plan.person.id
          : await create('Person', { ...plan.person.create, companyId });

    const updated = await twentyGraphql<{ updateCrmLead: { id: string } | null }>(
      'person',
      `mutation ConvertLead($id: UUID!, $data: CrmLeadUpdateInput!) {
        updateCrmLead(id: $id, data: $data) { id }
      }`,
      { id: leadId, data: { ...plan.leadUpdate, personId, companyId } },
    );

    if (!updated.data?.updateCrmLead) {
      return jsonResponse(500, {
        error: `Could not update the lead: ${describeGraphqlErrors(updated.errors)}`,
      });
    }
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : String(error) });
  }

  return jsonResponse(200, { leadId });
};

export default defineLogicFunction({
  universalIdentifier: CONVERT_LEAD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'convert-lead',
  description:
    'Turns a lead into an opportunity and links or makes its contact and customer.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: CONVERT_LEAD_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
