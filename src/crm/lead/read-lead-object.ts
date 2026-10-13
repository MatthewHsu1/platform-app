import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';

export const readLeadObject = async () => {
  const data = requireData(
    await twentyMetadata<{ objects: { edges: { node: { id: string; fieldsList: { id: string; name: string }[] } }[] } }>(
      'application',
      `query LeadObject($universalIdentifier: UUID!) {
        objects(filter: { universalIdentifier: { eq: $universalIdentifier } }, paging: { first: 1 }) {
          edges { node { id fieldsList { id name } } }
        }
      }`,
      { universalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER },
    ),
    'Read the lead object',
  );
  const object = data.objects.edges[0]?.node;

  if (object === undefined) {
    throw new Error('The Lead object is missing.');
  }

  return object;
};
