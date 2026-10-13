import { LEAD_TYPE } from 'src/crm/crm-options.constant';
import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';

type LeadObjectNode = { fieldsList: { id: string; name: string; defaultValue: unknown }[] };

// New records start as leads only when the company qualifies leads first.
// Every install puts the default of the app's own fields back to the one in
// code, so this runs after each install; it writes only when the default differs.
export const setLeadTypeDefault = async (useLeads: boolean) => {
  const data = requireData(
    await twentyMetadata<{ objects: { edges: { node: LeadObjectNode }[] } }>(
      'application',
      `query LeadTypeField($universalIdentifier: UUID!) {
        objects(filter: { universalIdentifier: { eq: $universalIdentifier } }, paging: { first: 1 }) {
          edges { node { fieldsList { id name defaultValue } } }
        }
      }`,
      { universalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER },
    ),
    'Read the lead type field',
  );
  const field = data.objects.edges[0]?.node.fieldsList.find((candidate) => candidate.name === 'leadType');
  const wanted = `'${useLeads ? LEAD_TYPE.LEAD : LEAD_TYPE.OPPORTUNITY}'`;

  if (field === undefined) {
    throw new Error('The lead has no Type field.');
  }
  if (field.defaultValue === wanted) {
    return;
  }
  requireData(
    await twentyMetadata(
      'application',
      `mutation LeadTypeDefault($input: UpdateOneFieldMetadataInput!) { updateOneField(input: $input) { id } }`,
      { input: { id: field.id, update: { defaultValue: wanted } } },
    ),
    'Change the lead type default',
  );
};
