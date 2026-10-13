import { type PreInstallApi } from 'src/shared/install/types/pre-install-api.type';
import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';

// No person runs an install: the app role alone, with its Data Model and Views rights.
export const TWENTY_PRE_INSTALL_API: PreInstallApi = {
  findObject: async (universalIdentifier) => {
    const data = requireData(
      await twentyMetadata<{ objects: { edges: { node: { id: string; fieldsList: { id: string; name: string; type: string }[] } }[] } }>(
        'application',
        `query FindObject($universalIdentifier: UUID!) {
          objects(filter: { universalIdentifier: { eq: $universalIdentifier } }, paging: { first: 1 }) {
            edges { node { id fieldsList { id name type } } }
          }
        }`,
        { universalIdentifier },
      ),
      'Find object',
    );
    const node = data.objects.edges[0]?.node;

    return node === undefined ? null : { id: node.id, fields: node.fieldsList };
  },
  listViews: async (objectMetadataId) =>
    requireData(
      await twentyMetadata<{ getViews: { id: string; name: string; mainGroupByFieldMetadataId: string | null }[] }>(
        'application',
        `query Views($objectMetadataId: String) { getViews(objectMetadataId: $objectMetadataId) { id name mainGroupByFieldMetadataId } }`,
        { objectMetadataId },
      ),
      'List views',
    ).getViews,
  destroyView: async (viewId) => {
    requireData(await twentyMetadata('application', `mutation DropView($id: String!) { destroyView(id: $id) }`, { id: viewId }), 'Destroy view');
  },
  deactivateField: async (fieldId) => {
    requireData(
      await twentyMetadata(
        'application',
        `mutation Deactivate($input: UpdateOneFieldMetadataInput!) { updateOneField(input: $input) { id } }`,
        { input: { id: fieldId, update: { isActive: false } } },
      ),
      'Deactivate field',
    );
  },
  deleteField: async (fieldId) => {
    requireData(
      await twentyMetadata('application', `mutation DeleteField($input: DeleteOneFieldInput!) { deleteOneField(input: $input) { id } }`, {
        input: { id: fieldId },
      }),
      'Delete field',
    );
  },
};
